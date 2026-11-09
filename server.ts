import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { extractPaperText, checkPoint, PaperText } from './server/evidence';
import { TIERS, detectHardware, preferredModels, recommendTier } from './server/hardware';
import {
  OLLAMA_HOST,
  OLLAMA_MODEL,
  OllamaModelMissingError,
  type OllamaMessage,
  OllamaUnavailableError,
  ollamaChat,
  ollamaStatus,
  ollamaWarmup,
  ollamaPull,
  isInstalled,
  setPreferredModels,
  contextFor,
  paperAsText,
  toJsonSchema,
} from './server/ollama';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Estimate how much of the 10-section analysis JSON has been written (0..1),
 * from the text generated so far: completed sections plus points in the current one.
 */
function estimateProgress(partialJson: string): number {
  const sectionStarts = [...partialJson.matchAll(/"id"\s*:/g)];
  if (sectionStarts.length === 0) {
    // Still writing the overview (title, authors, summary).
    return Math.min(0.05, partialJson.length / 12000);
  }
  const current = partialJson.slice(sectionStarts[sectionStarts.length - 1].index);
  const pointsInCurrent = (current.match(/"text"\s*:/g) || []).length;
  const done = sectionStarts.length - 1 + Math.min(pointsInCurrent / 3, 0.9);
  return Math.min(0.99, 0.05 + 0.95 * (done / 10));
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Increase payload limit for PDF base64 (up to 35 MB)
  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  // AI provider: "ollama" runs fully on this machine (no key, no cloud);
  // "gemini" uses Google's API. Without an explicit choice, use Gemini only when a key is set.
  const PROVIDER: 'gemini' | 'ollama' =
    process.env.AI_PROVIDER === 'gemini' || process.env.AI_PROVIDER === 'ollama'
      ? process.env.AI_PROVIDER
      : process.env.GEMINI_API_KEY
        ? 'gemini'
        : 'ollama';
  if (PROVIDER === 'ollama') {
    console.log(`AI provider: local Ollama at ${OLLAMA_HOST}`);
    // Prefer the model that suits this computer (GPU, RAM) unless OLLAMA_MODEL is set.
    detectHardware().then((hw) => {
      setPreferredModels(preferredModels(hw));
      console.log(`Hardware: ${JSON.stringify(hw)} -> recommended mode: ${recommendTier(hw)}`);
    });
  } else {
    console.log(`AI provider: Gemini (${MODEL})`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn('WARNING: GEMINI_API_KEY is not set. Analysis and Q&A requests will fail until it is configured.');
    }
  }

  /** User-facing message for local-engine problems, or null if the error is something else. */
  const ollamaErrorMessage = (err: any, ar: boolean): string | null => {
    if (err instanceof OllamaUnavailableError) {
      return ar
        ? 'محرك الذكاء الاصطناعي المحلي (Ollama) لا يعمل على هذا الجهاز. افتح برنامج Ollama من قائمة ابدأ ثم أعد المحاولة.'
        : 'The local AI engine (Ollama) is not running on this computer. Open Ollama from the Start menu, then try again.';
    }
    if (err instanceof OllamaModelMissingError) {
      return ar
        ? `لا يوجد نموذج ذكاء اصطناعي مثبت في Ollama. ثبّته بالأمر: ollama pull ${OLLAMA_MODEL}`
        : `No AI model is installed in Ollama. Install one with: ollama pull ${OLLAMA_MODEL}`;
    }
    if (/out of memory|requires more system memory|insufficient memory/i.test(err?.message || '')) {
      return ar
        ? 'ذاكرة الجهاز (RAM) غير كافية لتشغيل النموذج. أغلق البرامج الأخرى وأعد المحاولة، أو استخدم نموذجاً أصغر مثل qwen2.5:3b.'
        : 'Not enough memory (RAM) to run the model. Close other programs and retry, or use a smaller model such as qwen2.5:3b.';
    }
    return null;
  };

  // Initialize shared Gemini client (the key stays on the server and is never sent to the browser)
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Schema for structured 10-section academic peer-review
  const analysisResponseSchema = {
    type: Type.OBJECT,
    properties: {
      overview: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Title of the paper' },
          authors: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of authors',
          },
          year: { type: Type.STRING, description: 'Publication year or year of preprint' },
          venue: { type: Type.STRING, description: 'Journal, conference, or repository' },
          field: { type: Type.STRING, description: 'Scientific discipline / research field' },
          summary: { type: Type.STRING, description: '2-3 sentence executive academic summary' },
        },
        required: ['title', 'authors', 'year', 'venue', 'field', 'summary'],
      },
      sections: {
        type: Type.ARRAY,
        description: 'Array of exactly 10 academic peer-review evaluation sections',
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER, description: 'Section number from 1 to 10' },
            title: { type: Type.STRING, description: 'Section title' },
            isNotStated: {
              type: Type.BOOLEAN,
              description: 'True ONLY if the topic is completely absent and unaddressed in the paper',
            },
            points: {
              type: Type.ARRAY,
              description: 'Array of evidence-backed points',
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: 'The analytical insight or statement' },
                  page: { type: Type.INTEGER, description: 'Exact page number in the PDF where evidence is found (integer starting at 1)' },
                  type: {
                    type: Type.STRING,
                    enum: ['explicit', 'inferred'],
                    description: '"explicit" if directly stated in text, "inferred" if an analytical synthesis/critique',
                  },
                  quote: { type: Type.STRING, description: 'Exact short verbatim supporting quote (1-2 sentences) from the paper' },
                  category: {
                    type: Type.STRING,
                    enum: ['general', 'strength', 'weakness'],
                    description: 'For section 9 (Critical Evaluation): "strength" or "weakness". Otherwise "general"',
                  },
                },
                required: ['text', 'page', 'type', 'quote', 'category'],
              },
            },
          },
          required: ['id', 'title', 'points'],
        },
      },
    },
    required: ['overview', 'sections'],
  };

  // API Route: which AI engine is active (shown in the UI)
  app.get('/api/health', async (_req, res) => {
    if (PROVIDER === 'ollama') {
      const st = await ollamaStatus();
      // Load the model into memory while the user picks a file, so analysis starts sooner.
      if (st.running && st.modelInstalled) void ollamaWarmup(st.model);
      return res.json({ provider: 'ollama', ready: st.running && st.modelInstalled, ...st });
    }
    return res.json({ provider: 'gemini', model: MODEL, ready: !!process.env.GEMINI_API_KEY });
  });

  // API Route: analysis modes (local models) with this computer's recommendation
  app.get('/api/models', async (_req, res) => {
    if (PROVIDER !== 'ollama') return res.json({ provider: PROVIDER, tiers: [] });
    const hw = await detectHardware();
    const st = await ollamaStatus();
    const tiers = await Promise.all(
      TIERS.map(async (t) => ({ ...t, installed: st.running ? await isInstalled(t.model).catch(() => false) : false }))
    );
    return res.json({ provider: 'ollama', running: st.running, hardware: hw, recommended: recommendTier(hw), current: st.model, tiers });
  });

  // API Route: download a mode's model (NDJSON progress), only the models offered in TIERS
  app.post('/api/models/pull', async (req, res) => {
    const tier = TIERS.find((t) => t.id === req.body?.tier);
    if (PROVIDER !== 'ollama' || !tier) return res.status(400).json({ error: 'Unknown mode' });
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.flushHeaders();
    let last = -1;
    try {
      await ollamaPull(tier.model, (percent, doneMB, totalMB) => {
        if (percent !== last) {
          last = percent;
          res.write(JSON.stringify({ type: 'progress', percent, doneMB, totalMB }) + '\n');
        }
      });
      res.write(JSON.stringify({ type: 'done', model: tier.model }) + '\n');
    } catch (err: any) {
      const ar = req.body?.language === 'ar';
      res.write(
        JSON.stringify({
          type: 'error',
          error:
            ollamaErrorMessage(err, ar) ??
            (ar ? 'تعذر تنزيل النموذج. تحقق من اتصال الإنترنت وأعد المحاولة.' : 'Could not download the model. Check your internet connection and retry.'),
        }) + '\n'
      );
    }
    res.end();
  });

  // API Route: Analyze PDF
  app.post('/api/analyze', async (req, res) => {
    // With { stream: true } the response is NDJSON: progress events while the model works,
    // then one {type:"result"} or {type:"error"} event. Otherwise a single JSON response.
    const wantsStream = req.body?.stream === true;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const send = (event: object) => {
      if (wantsStream && !res.writableEnded) res.write(JSON.stringify(event) + '\n');
    };
    const fail = (status: number, error: string, detail?: string) => {
      clearInterval(heartbeat);
      if (wantsStream) {
        send({ type: 'error', error });
        return res.end();
      }
      return res.status(status).json({ error, detail });
    };
    if (wantsStream) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.flushHeaders();
      // Keep the connection visibly alive while the model reads the paper (no output yet).
      heartbeat = setInterval(() => send({ type: 'heartbeat' }), 15000);
    }

    try {
      const { pdfBase64, language = 'ar', fileName = 'paper.pdf', fileSize = 'Unknown', model: requestedModel } = req.body;

      if (!pdfBase64) {
        return fail(400, 'Missing PDF base64 data');
      }

      // Clean base64 string if data URI prefix is present
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');

      const isArabic = language === 'ar';

      if (PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
        return fail(
          503,
          isArabic
            ? 'لم يتم إعداد مفتاح Gemini على الخادم بعد. يرجى التواصل مع مسؤول التطبيق.'
            : 'The Gemini API key is not configured on the server yet. Please contact the app administrator.'
        );
      }

      send({ type: 'stage', stage: 'extract' });
      // Extract the real text of every page so the AI's evidence can be verified afterwards.
      let paperText: PaperText | null = null;
      try {
        paperText = await extractPaperText(Buffer.from(cleanBase64, 'base64'));
      } catch (e) {
        console.warn('PDF text extraction failed; evidence verification skipped:', e);
      }
      if (paperText && paperText.rawCharCount < 200) {
        return fail(
          422,
          isArabic
            ? 'يبدو أن هذا الملف ممسوح ضوئياً (صور بدون نص قابل للقراءة). يرجى رفع نسخة PDF نصية من الورقة.'
            : 'This PDF looks scanned (images without selectable text). Please upload a text-based PDF of the paper.'
        );
      }

      const systemInstruction = `You are an elite academic peer reviewer and research scientist in the PaperMind AI system.
Your mission is to perform a rigorous, deep, evidence-backed evaluation of the attached research paper PDF.

CRITICAL INSTRUCTIONS:
1. LANGUAGE: You MUST write your entire analysis exclusively in ${isArabic ? 'Arabic (اللغة العربية الفصحى الأكاديمية)' : 'English (High academic standard)'}.
2. ACCURACY & EVIDENCE: Every single point must be grounded strictly in the provided paper. Never fabricate numbers, authors, citations, or baseline comparisons.
3. 10 MANDATORY SECTIONS in exact order:
   1. ${isArabic ? 'نظرة عامة على الورقة' : 'Paper Overview'}
   2. ${isArabic ? 'المشكلة البحثية والفجوة المعرفية' : 'Research Problem & Gap'}
   3. ${isArabic ? 'الأهداف، الأسئلة البحثية والفرضيات' : 'Objectives, Research Questions & Hypotheses'}
   4. ${isArabic ? 'المساهمات العلمية الرئيسية' : 'Main Contributions'}
   5. ${isArabic ? 'المنهجية العلمية' : 'Methodology'}
   6. ${isArabic ? 'البيانات، الأدوات، والنماذج' : 'Data, Tools & Models'}
   7. ${isArabic ? 'النتائج والمناقشة' : 'Results & Discussion'} (Must include key quantitative metrics, p-values, accuracy, F1, or benchmark numbers if present)
   8. ${isArabic ? 'محددات وقصور البحث' : 'Limitations'}
   9. ${isArabic ? 'التقييم النقدي (نقاط القوة والضعف)' : 'Critical Evaluation (Strengths & Weaknesses)'} (Every point must set category to "strength" or "weakness")
   10. ${isArabic ? 'آفاق وتوجهات البحث المستقبلي' : 'Future Research Directions'}
4. PAGE NUMBERS: Every single point MUST cite the exact page number (starting from 1) where the evidence appears in this PDF.
5. EXPLICIT VS INFERRED:
   - "explicit": verbatim claim or stated fact directly in the text.
   - "inferred": peer-reviewer interpretation, analytical synthesis, or critical evaluation.
6. QUOTES: Provide a short, direct verbatim quote (1-2 sentences) copied character-for-character from the paper, in the paper's original language, backing each point. Never translate or paraphrase the quote. The quote must appear on the cited page.
   NUMBERS: Copy every number exactly as printed, and keep each number attached to its correct label (e.g. which class, model or group it belongs to). Re-read tables before reporting counts or metrics; do not swap values between categories. Do not compute new numbers and label them "explicit".
7. MISSING SECTIONS: If a section is genuinely not addressed anywhere in the paper, set isNotStated to true, and in points put one point with text: "${isArabic ? 'غير مذكور في الورقة البحثية' : 'Not stated in the paper'}", page: 1, type: "inferred".`;

      const promptText = isArabic
        ? 'قم بتحليل هذه الورقة البحثية بعمق وموضوعية علمية كاملة وفق البنية الهيكلية المحددة مع استخراج الأدلة وأرقام الصفحات بدقة متناهية.'
        : 'Analyze this research paper deeply with rigorous scientific evaluation, page-level evidence, and structured output as specified.';

      let rawJson: string | undefined;
      let truncatedNote: { truncated: boolean; pagesIncluded: number } | undefined;
      let engineName = `Gemini · ${MODEL}`;
      let engineStats: object | undefined;

      if (PROVIDER === 'ollama') {
        if (!paperText) {
          throw new Error('Could not extract text from this PDF for the local model');
        }
        // Local models cannot read PDFs, so they get the extracted text with [Page N] markers.
        const paper = paperAsText(paperText.rawPages);
        truncatedNote = { truncated: paper.truncated, pagesIncluded: paper.pagesIncluded };
        const system =
          systemInstruction.replace('the attached research paper PDF', 'the research paper text below') +
          '\n8. The paper text is split by [Page N] markers. Use those numbers as page numbers.' +
          '\n9. Be concise to keep the analysis fast: give 2 or 3 strong points per section, each point one sentence (max 30 words), and a short quote (max 20 words). Return only JSON matching the schema.';
        const user = `${promptText}\n\n=== PAPER TEXT ===${paper.text}`;

        send({ type: 'stage', stage: 'reading', pages: paper.pagesIncluded });
        let firstTokenAt = 0;
        let lastSent = 0;
        const local = await ollamaChat(
          [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          toJsonSchema(analysisResponseSchema),
          {
            model: requestedModel,
            numCtx: contextFor(system.length + user.length, 3000),
            onProgress: (textSoFar) => {
              const now = Date.now();
              if (!firstTokenAt) {
                firstTokenAt = now;
                send({ type: 'stage', stage: 'writing' });
              }
              if (now - lastSent < 1000) return;
              lastSent = now;
              const fraction = estimateProgress(textSoFar);
              const genSeconds = (now - firstTokenAt) / 1000;
              send({
                type: 'progress',
                percent: Math.min(99, Math.round(10 + 89 * fraction)),
                etaSeconds: fraction > 0.06 && genSeconds > 10 ? Math.round((genSeconds / fraction) * (1 - fraction)) : null,
                sectionsDone: Math.max(0, Math.min(10, Math.floor(fraction * 10))),
              });
            },
          }
        );
        rawJson = local.text;
        engineName = `Ollama · ${local.model}`;
        engineStats = local.stats;
      } else {
        send({ type: 'stage', stage: 'reading' });
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: cleanBase64,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: analysisResponseSchema,
          },
        });
        rawJson = response.text;
      }
      if (!rawJson) {
        throw new Error('Empty response received from AI model');
      }

      const parsedData = JSON.parse(rawJson);

      // Enhance with client metadata
      const result = {
        overview: parsedData.overview,
        sections: parsedData.sections.map((sec: any, index: number) => ({
          id: sec.id || index + 1,
          key: `section_${sec.id || index + 1}`,
          title: sec.title,
          isNotStated: !!sec.isNotStated,
          points: (sec.points || []).map((pt: any, ptIdx: number) => {
            const base = {
              id: `pt_${sec.id || index + 1}_${ptIdx + 1}`,
              text: pt.text,
              page: typeof pt.page === 'number' && pt.page > 0 ? pt.page : 1,
              type: pt.type === 'explicit' ? 'explicit' : 'inferred',
              quote: pt.quote || undefined,
              category: ['strength', 'weakness'].includes(pt.category) ? pt.category : 'general',
            };
            if (!paperText || sec.isNotStated) return base;
            const { check, page } = checkPoint(paperText, base);
            return { ...base, page, evidence: check };
          }),
        })),
        fileName,
        fileSize,
        analyzedAt: new Date().toISOString(),
        language,
        pageCount: paperText?.pages.length,
        engine: engineName,
        truncatedAfterPage: truncatedNote?.truncated ? truncatedNote.pagesIncluded : undefined,
        engineStats,
      };

      clearInterval(heartbeat);
      if (wantsStream) {
        send({ type: 'result', data: result });
        return res.end();
      }
      return res.json(result);
    } catch (err: any) {
      console.error('Analysis error:', err);
      const isArabic = req.body?.language === 'ar';
      let message = isArabic
        ? 'حدث خطأ أثناء تحليل الورقة. يرجى التحقق من صحة الملف والمحاولة مجدداً.'
        : 'An error occurred while analyzing the paper. Please verify the PDF and try again.';

      const localMessage = ollamaErrorMessage(err, isArabic);
      if (localMessage) {
        message = localMessage;
      } else if (err?.message?.includes('RESOURCE_EXHAUSTED')) {
        message = isArabic
          ? 'تم تجاوز حد الاستخدام المؤقت للخدمة. يرجى الانتظار لحظات وإعادة المحاولة.'
          : 'Service rate limit reached. Please wait a moment and try again.';
      }

      return fail(500, message, err.message);
    }
  });

  // API Route: Ask the Paper (Q&A)
  app.post('/api/chat', async (req, res) => {
    try {
      const { pdfBase64, language = 'ar', question, messages = [], model: requestedModel } = req.body;

      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      const isArabic = language === 'ar';

      const systemInstruction = `You are PaperMind AI's specialized Paper Assistant.
You answer questions STRICTLY and EXCLUSIVELY based on the uploaded research paper PDF.

RULES:
1. LANGUAGE: Respond strictly in ${isArabic ? 'Arabic (العربية الفصحى الأكاديمية)' : 'English'}.
2. EVIDENCE & CITATIONS: Always cite the exact page numbers in brackets, e.g., [p. 3] or [ص. 3], for every assertion you make.
3. STRICT FACTUAL BOUNDARY: If the answer is NOT mentioned or cannot be directly proven from the paper, you MUST state clearly:
   "${isArabic ? 'هذه المعلومة غير مذكورة في الورقة البحثية.' : 'This is not mentioned in the paper.'}"
   Never speculate, guess, or use external knowledge not found in the PDF.
4. TONE: Clear, concise, scholarly, and objective.`;

      if (PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: isArabic ? 'لم يتم إعداد مفتاح Gemini على الخادم بعد.' : 'The Gemini API key is not configured on the server yet.',
        });
      }

      // The paper goes first, followed by the whole conversation so follow-up questions keep their context.
      const contents: any[] = [];
      const history = (Array.isArray(messages) ? messages : []).slice(-20);
      const paperPart = pdfBase64
        ? [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfBase64.replace(/^data:application\/pdf;base64,/, ''),
              },
            },
            { text: 'This is the research paper to examine. Answer the questions that follow using only this paper.' },
          ]
        : [];
      if (paperPart.length) {
        contents.push({ role: 'user', parts: paperPart });
        contents.push({ role: 'model', parts: [{ text: isArabic ? 'تمت قراءة الورقة. تفضل بسؤالك.' : 'I have read the paper. Please ask your question.' }] });
      }
      for (const msg of history) {
        if (!msg?.text) continue;
        contents.push({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: String(msg.text) }] });
      }
      contents.push({ role: 'user', parts: [{ text: question }] });

      let replyText = '';
      if (PROVIDER === 'ollama') {
        let paperBlock = '';
        if (pdfBase64) {
          const extracted = await extractPaperText(
            Buffer.from(pdfBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64')
          );
          paperBlock = `\n\nThe paper text is split by [Page N] markers; cite those page numbers.\n=== PAPER TEXT ===${paperAsText(extracted.rawPages).text}`;
        }
        const chatMessages: OllamaMessage[] = [
          { role: 'system', content: systemInstruction.replace('uploaded research paper PDF', 'research paper text below') + paperBlock },
          ...history
            .filter((m: any) => m?.text)
            .map((m: any) => ({ role: m.role === 'model' ? ('assistant' as const) : ('user' as const), content: String(m.text) })),
          { role: 'user', content: question },
        ];
        const local = await ollamaChat(chatMessages, undefined, {
          model: requestedModel,
          numCtx: contextFor(chatMessages.reduce((n, m) => n + m.content.length, 0), 1200),
        });
        replyText = local.text;
      } else {
        const response = await ai.models.generateContent({
          model: MODEL,
          contents,
          config: {
            systemInstruction,
          },
        });
        replyText = response.text || '';
      }

      // Extract page citations like [p. 4] or [ص. 4] or (p. 4)
      const pageMatches = replyText.match(/(?:\[|\()(?:\s*p\.?|\s*ص\.?)\s*(\d+)(?:\]|\))/gi);
      const citations: number[] = [];
      if (pageMatches) {
        for (const match of pageMatches) {
          const numMatch = match.match(/\d+/);
          if (numMatch) {
            const pageNum = parseInt(numMatch[0]);
            if (!citations.includes(pageNum)) {
              citations.push(pageNum);
            }
          }
        }
      }

      const isNotMentioned =
        replyText.toLowerCase().includes('not mentioned in the paper') ||
        replyText.includes('غير مذكورة في الورقة') ||
        replyText.includes('لم تذكر الورقة') ||
        replyText.includes('غير مذكور في الورقة');

      return res.json({
        text: replyText,
        citations,
        isNotMentioned,
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      const isArabic = req.body?.language === 'ar';
      const message =
        ollamaErrorMessage(err, isArabic) ??
        (isArabic
            ? 'حدث خطأ أثناء معالجة السؤال. يرجى المحاولة مرة أخرى.'
            : 'An error occurred while answering your question. Please try again.');
      return res.status(500).json({ error: message, detail: err.message });
    }
  });

  // Mount Vite or serve static files
  if (!isProd) {
    // Loaded only in development, so production builds (and the desktop app) do not need Vite.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // PAPERMIND_DIST lets the desktop app point at the bundled frontend.
    const distDir = process.env.PAPERMIND_DIST || path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // The desktop app binds to 127.0.0.1 so the server is reachable only from this computer.
  const HOST = process.env.HOST || '0.0.0.0';
  return new Promise<number>((resolve) => {
    const server = app.listen(PORT, HOST, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : PORT;
      console.log(`PaperMind AI full-stack server running on http://${HOST}:${port}`);
      resolve(port);
    });
  });
}

/** Resolves with the port once the server is listening (used by the desktop app). */
export const serverReady = startServer();
