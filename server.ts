import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Increase payload limit for PDF base64 (up to 35 MB)
  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  // Initialize shared Gemini client
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
                    description: '"explicit" if directly stated in text, "inferred" if an analytical synthesis/critique',
                  },
                  quote: { type: Type.STRING, description: 'Exact short verbatim supporting quote (1-2 sentences) from the paper' },
                  category: {
                    type: Type.STRING,
                    description: 'For section 9 (Critical Evaluation): "strength" or "weakness". Otherwise "general"',
                  },
                },
                required: ['text', 'page', 'type'],
              },
            },
          },
          required: ['id', 'title', 'points'],
        },
      },
    },
    required: ['overview', 'sections'],
  };

  // API Route: Analyze PDF
  app.post('/api/analyze', async (req, res) => {
    try {
      const { pdfBase64, language = 'ar', fileName = 'paper.pdf', fileSize = 'Unknown' } = req.body;

      if (!pdfBase64) {
        return res.status(400).json({ error: 'Missing PDF base64 data' });
      }

      // Clean base64 string if data URI prefix is present
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');

      const isArabic = language === 'ar';

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
6. QUOTES: Provide a short, direct verbatim quote (1-2 sentences) from the paper backing each point.
7. MISSING SECTIONS: If a section is genuinely not addressed anywhere in the paper, set isNotStated to true, and in points put one point with text: "${isArabic ? 'غير مذكور في الورقة البحثية' : 'Not stated in the paper'}", page: 1, type: "inferred".`;

      const promptText = isArabic
        ? 'قم بتحليل هذه الورقة البحثية بعمق وموضوعية علمية كاملة وفق البنية الهيكلية المحددة مع استخراج الأدلة وأرقام الصفحات بدقة متناهية.'
        : 'Analyze this research paper deeply with rigorous scientific evaluation, page-level evidence, and structured output as specified.';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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

      const rawJson = response.text;
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
          points: (sec.points || []).map((pt: any, ptIdx: number) => ({
            id: `pt_${sec.id || index + 1}_${ptIdx + 1}`,
            text: pt.text,
            page: typeof pt.page === 'number' && pt.page > 0 ? pt.page : 1,
            type: pt.type === 'explicit' ? 'explicit' : 'inferred',
            quote: pt.quote || undefined,
            category: pt.category || (sec.id === 9 ? (ptIdx % 2 === 0 ? 'strength' : 'weakness') : 'general'),
          })),
        })),
        fileName,
        fileSize,
        analyzedAt: new Date().toISOString(),
        language,
      };

      return res.json(result);
    } catch (err: any) {
      console.error('Analysis error:', err);
      const isArabic = req.body?.language === 'ar';
      let message = isArabic
        ? 'حدث خطأ أثناء تحليل الورقة. يرجى التحقق من صحة الملف والمحاولة مجدداً.'
        : 'An error occurred while analyzing the paper. Please verify the PDF and try again.';

      if (err?.message?.includes('RESOURCE_EXHAUSTED')) {
        message = isArabic
          ? 'تم تجاوز حد الاستخدام المؤقت للخدمة. يرجى الانتظار لحظات وإعادة المحاولة.'
          : 'Service rate limit reached. Please wait a moment and try again.';
      }

      return res.status(500).json({ error: message, detail: err.message });
    }
  });

  // API Route: Ask the Paper (Q&A)
  app.post('/api/chat', async (req, res) => {
    try {
      const { pdfBase64, language = 'ar', question, messages = [] } = req.body;

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

      const contents: any[] = [];

      // Include PDF in the first turn or context
      if (pdfBase64) {
        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
        contents.push({
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: cleanBase64,
              },
            },
            {
              text: `This is the research paper to examine. Conversation begins below.\nUser: ${question}`,
            },
          ],
        });
      } else {
        // Fallback if paper text or previous turns
        for (const msg of messages) {
          contents.push({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }],
          });
        }
        contents.push({
          role: 'user',
          parts: [{ text: question }],
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
        },
      });

      const replyText = response.text || '';

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
      const message = isArabic
        ? 'حدث خطأ أثناء معالجة السؤال. يرجى المحاولة مرة أخرى.'
        : 'An error occurred while answering your question. Please try again.';
      return res.status(500).json({ error: message, detail: err.message });
    }
  });

  // Mount Vite or serve static files
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PaperMind AI full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
