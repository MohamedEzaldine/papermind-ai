/**
 * Section-by-section analysis on a local Ollama model, designed for small models on
 * ordinary computers (no graphics card).
 *
 * For each of the 10 sections:
 *  1. The server picks the ~12 most relevant sentences of the paper (server/retrieval.ts).
 *  2. The model writes up to 3 short points in English and cites the supporting sentence by
 *     its id. The quote and page shown to the user are taken from that sentence, so they
 *     always come from the paper.
 *  3. For Arabic, a second short request translates the points; any translation with
 *     broken script falls back to the English text.
 * Every request is size-capped and watched for stalls (retried once; a section that still
 * fails is reported as such instead of blocking the analysis).
 */
import { OllamaMessage, OllamaStalledError, ollamaChat, withoutReferences } from './ollama';
import { Sentence, cleanPointText, dedupe, formatExcerpts, goodArabicTranslation, numbersSupported, selectSentences, splitSentences } from './retrieval';

const SECTIONS: { id: number; ar: string; en: string; focus: string }[] = [
  { id: 1, ar: 'نظرة عامة على الورقة', en: 'Paper Overview', focus: 'what the paper is about: its topic, approach and setting' },
  { id: 2, ar: 'المشكلة البحثية والفجوة المعرفية', en: 'Research Problem & Gap', focus: 'the problem the paper addresses and what is missing or weak in previous work' },
  { id: 3, ar: 'الأهداف، الأسئلة البحثية والفرضيات', en: 'Objectives, Research Questions & Hypotheses', focus: 'what the authors aim to achieve, the questions they ask and any assumptions or hypotheses' },
  { id: 4, ar: 'المساهمات العلمية الرئيسية', en: 'Main Contributions', focus: 'the main contributions the authors claim' },
  { id: 5, ar: 'المنهجية العلمية', en: 'Methodology', focus: 'how the method works: models, steps, decision rules and design choices' },
  { id: 6, ar: 'البيانات، الأدوات، والنماذج', en: 'Data, Tools & Models', focus: 'the datasets with their exact sizes and periods, and the tools, software and models used' },
  { id: 7, ar: 'النتائج والمناقشة', en: 'Results & Discussion', focus: 'the key results with their exact numbers, and how the authors interpret them' },
  { id: 8, ar: 'محددات وقصور البحث', en: 'Limitations', focus: 'limitations, constraints and weak points of the study (stated by the authors or evident from the excerpts)' },
  { id: 9, ar: 'التقييم النقدي (نقاط القوة والضعف)', en: 'Critical Evaluation (Strengths & Weaknesses)', focus: 'a critical evaluation: at least one strength and at least one weakness of the study' },
  { id: 10, ar: 'آفاق وتوجهات البحث المستقبلي', en: 'Future Research Directions', focus: 'future work the authors plan or that naturally follows from the study' },
];

const NOT_STATED = 'NOT_IN_PAPER';

function sectionSchema(ids: string[], critical: boolean) {
  return {
    type: 'object',
    properties: {
      points: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', maxLength: 240 },
            evidence: { type: 'string', enum: [...ids, NOT_STATED] },
            type: { type: 'string', enum: ['explicit', 'inferred'] },
            ...(critical ? { category: { type: 'string', enum: ['strength', 'weakness'] } } : {}),
          },
          required: ['text', 'evidence', 'type', ...(critical ? ['category'] : [])],
        },
      },
    },
    required: ['points'],
  };
}

const overviewSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', maxLength: 300 },
    authors: { type: 'array', maxItems: 15, items: { type: 'string', maxLength: 60 } },
    year: { type: 'string', maxLength: 10 },
    venue: { type: 'string', maxLength: 200 },
    field: { type: 'string', maxLength: 100 },
    summary: { type: 'string', maxLength: 600 },
  },
  required: ['title', 'authors', 'year', 'venue', 'field', 'summary'],
};

const translationSchema = (n: number) => ({
  type: 'object',
  properties: {
    translations: { type: 'array', minItems: n, maxItems: n, items: { type: 'string', maxLength: 400 } },
  },
  required: ['translations'],
});

const SYSTEM_ANALYST = `You are an expert academic peer reviewer.
Use ONLY the numbered excerpts from the paper that the user gives you.
Rules:
- Write each point as one clear English sentence (max 30 words). Do not repeat the same idea twice.
- Copy numbers exactly and keep each number with its correct label.
- "evidence": the id (like S12) of the excerpt that best supports the point.
- "type": "explicit" if that excerpt states it directly, "inferred" if it is your own judgement.
- Never mention anything that is not in the excerpts. Every number you write must appear in the excerpt you cite.
- Do not write excerpt ids (like S12) or page numbers inside "text".`;

const SYSTEM_TRANSLATOR = `You translate academic English into clear, formal Arabic (Modern Standard Arabic).
Rules: write only Arabic script, except that names of methods, models, datasets, software, metrics and all numbers stay exactly as in English (e.g. LSTM-AE, AUC, 97.31%). Never mix English letters into an Arabic word. Keep the meaning exact. Return one translation per input sentence, in the same order.
Glossary: instance(s) = حالة/حالات; anomaly = شذوذ; anomaly detection = كشف الشذوذ; labeled data = بيانات مصنّفة; unlabeled = غير مصنّفة; semi-supervised = شبه خاضع للإشراف; supervised = خاضع للإشراف; autoencoder = المرمّز التلقائي; encoder = المشفّر; decoder = مفكّك الترميز; reconstruction error = خطأ إعادة البناء; threshold = عتبة; dataset = مجموعة البيانات; training = التدريب; evaluation = التقييم; framework = إطار عمل; deep learning = التعلّم العميق; machine learning = تعلّم الآلة; accuracy = الدقة; performance = الأداء; consumers = المستهلكون; customers = العملاء; participants = المشاركون; sample = عينة; hypothesis = فرضية; limitation = قيد; robustness = المتانة; scalability = قابلية التوسّع; cloud = السحابة; electricity theft = سرقة الكهرباء; non-technical losses = الخسائر غير الفنية.`;

export interface LocalProgress {
  stage: 'reading' | 'writing';
  partsDone: number;
  partsTotal: number;
  sectionTitle?: string;
  etaSeconds: number | null;
  tokensPerSecond?: number;
  pages?: number;
}

export async function analyzeLocally(
  rawPages: string[],
  language: 'ar' | 'en',
  model: string | undefined,
  onProgress: (p: LocalProgress) => void
): Promise<{ overview: any; sections: any[]; model: string; truncatedAfterPage?: number; stats: object }> {
  const isAr = language === 'ar';
  const pages = withoutReferences(rawPages);
  const sentences = splitSentences(pages);
  const byId = new Map(sentences.map((s) => [s.id, s]));

  const partsTotal = SECTIONS.length + 1;
  let partsDone = 0;
  let usedModel = model || '';
  let writingStarted = false;
  let tokens = 0;
  let writingSeconds = 0;
  let partFirstTokenAt = 0;
  const partDurations: number[] = [];
  let currentTitle: string | undefined;

  const report = () => {
    const liveSeconds = writingSeconds + (partFirstTokenAt ? (Date.now() - partFirstTokenAt) / 1000 : 0);
    const avg = partDurations.length ? partDurations.reduce((a, b) => a + b, 0) / partDurations.length : 0;
    onProgress({
      stage: writingStarted ? 'writing' : 'reading',
      partsDone,
      partsTotal,
      sectionTitle: currentTitle,
      etaSeconds: avg ? Math.round(avg * (partsTotal - partsDone)) : null,
      tokensPerSecond: liveSeconds > 1 ? +(tokens / liveSeconds).toFixed(1) : undefined,
      pages: pages.length,
    });
  };

  /** One short request to the model, retried once if it stalls or returns unusable JSON. */
  const ask = async (system: string, user: string, schema: object, numPredict: number): Promise<any | null> => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      let partFirstToken = 0;
      let lastReport = 0;
      try {
        const messages: OllamaMessage[] = [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ];
        const res = await ollamaChat(messages, schema, {
          model,
          numCtx: 4096,
          numPredict,
          stallSeconds: 60,
          onFirstToken: () => {
            partFirstToken = Date.now();
            partFirstTokenAt = partFirstToken;
            if (!writingStarted) {
              writingStarted = true;
              report();
            }
          },
          onProgress: () => {
            tokens++;
            if (Date.now() - lastReport > 1500) {
              lastReport = Date.now();
              report();
            }
          },
        });
        usedModel = res.model;
        if (partFirstToken) writingSeconds += (Date.now() - partFirstToken) / 1000;
        partFirstTokenAt = 0;
        try {
          return JSON.parse(res.text);
        } catch {
          console.warn(`Local analysis: unusable JSON (attempt ${attempt})`);
        }
      } catch (e) {
        if (partFirstToken) writingSeconds += (Date.now() - partFirstToken) / 1000;
        partFirstTokenAt = 0;
        if (!(e instanceof OllamaStalledError)) throw e;
        console.warn(`Local analysis: request stalled (attempt ${attempt})`);
      }
    }
    return null;
  };

  /** Translate English sentences to Arabic; keeps the English text for any bad translation. */
  const toArabic = async (texts: string[]): Promise<string[]> => {
    if (!isAr || texts.length === 0) return texts;
    const res = await ask(
      SYSTEM_TRANSLATOR,
      `Translate these ${texts.length} sentences:\n${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
      translationSchema(texts.length),
      Math.min(900, 160 * texts.length)
    );
    const out: string[] = Array.isArray(res?.translations) ? res.translations : [];
    return texts.map((en, i) => {
      const ar = cleanPointText(out[i] || '');
      return goodArabicTranslation(en, ar) ? ar : en;
    });
  };

  // --- Overview: from the first page (title, authors and abstract are there) ---
  const timed = async <T,>(fn: () => Promise<T>): Promise<T> => {
    const started = Date.now();
    const r = await fn();
    partDurations.push((Date.now() - started) / 1000);
    return r;
  };

  currentTitle = isAr ? 'نظرة عامة' : 'Overview';
  report();
  const firstPage = (pages[0] || '').slice(0, 3500);
  const overview = await timed(async () => {
    const o =
      (await ask(
        'You extract bibliographic details from the first page of a research paper. Copy the title, author names and venue exactly as written (do not translate them).',
        `First page of the paper:\n${firstPage}\n\nReturn: title, authors, year, venue (journal or conference), field (2-6 English words), and summary (2 English sentences about what the paper does and finds).`,
        overviewSchema,
        420
      )) || { title: '', authors: [], year: '', venue: '', field: '', summary: '' };
    if (isAr) {
      const [field, summary] = await toArabic([o.field || '', o.summary || ''].map(String));
      o.field = field;
      o.summary = summary;
    }
    return o;
  });
  partsDone++;
  report();

  // --- The 10 sections ---
  const sections: any[] = [];
  for (const sec of SECTIONS) {
    currentTitle = isAr ? sec.ar : sec.en;
    report();
    const excerpts: Sentence[] = selectSentences(sentences, sec.id, 12);
    const ids = excerpts.map((s) => s.id);
    const critical = sec.id === 9;

    const section = await timed(async () => {
      const res = await ask(
        SYSTEM_ANALYST,
        `Excerpts from the paper:\n${formatExcerpts(excerpts)}\n\nTask: give up to 3 distinct points about ${sec.focus}.${
          critical ? ' Set "category" to "strength" or "weakness" for each point.' : ''
        } Only if the excerpts say nothing about this, return one point with evidence "${NOT_STATED}".`,
        sectionSchema(ids, critical),
        critical ? 380 : 320
      );
      if (!res) {
        return {
          failed: true,
          points: [
            {
              text: isAr
                ? 'تعذر تحليل هذا القسم على هذا الجهاز. أعد التحليل أو جرّب وضعاً آخر.'
                : 'This section could not be analyzed on this computer. Retry, or try another mode.',
              page: 1,
              type: 'inferred',
              quote: '',
            },
          ],
        };
      }
      const raw = (Array.isArray(res.points) ? res.points : []).filter((p: any) => p && typeof p.text === 'string' && p.text.trim());
      // Keep points that cite a real excerpt, strip ids from the text, and drop points whose
      // numbers are not in the sentence they cite (small models sometimes invent numbers).
      const cited = raw
        .filter((p: any) => p.evidence !== NOT_STATED && byId.has(p.evidence))
        .map((p: any) => ({ ...p, text: cleanPointText(p.text) }))
        .filter((p: any) => p.text.length > 10);
      const grounded = dedupe(cited.filter((p: any) => numbersSupported(p.text, byId.get(p.evidence)!.text)));
      if (cited.length > 0 && grounded.length === 0) {
        return {
          failed: true,
          points: [
            {
              text: isAr
                ? 'لم يتمكن النموذج المحلي من استخراج نقاط موثوقة لهذا القسم. جرّب وضع «دقيق» أو أعد التحليل.'
                : 'The local model could not extract reliable points for this section. Try the Accurate mode or retry.',
              page: 1,
              type: 'inferred',
              quote: '',
            },
          ],
        };
      }
      const texts = await toArabic(grounded.map((p: any) => p.text.trim()));
      return {
        failed: false,
        points: grounded.map((p: any, i: number) => {
          const s = byId.get(p.evidence)!;
          return {
            text: texts[i],
            page: s.page,
            type: p.type === 'explicit' ? 'explicit' : 'inferred',
            // The quote is the paper's own sentence, so it is always genuine.
            quote: s.text.length > 260 ? s.text.slice(0, 260).replace(/\s+\S*$/, '') + '…' : s.text,
            ...(critical ? { category: p.category === 'strength' ? 'strength' : 'weakness' } : {}),
          };
        }),
      };
    });

    const notStated = !section.failed && section.points.length === 0;
    sections.push({ id: sec.id, title: currentTitle, isNotStated: notStated, points: section.points });
    partsDone++;
    report();
  }

  return {
    overview,
    sections,
    model: usedModel,
    stats: {
      tokensPerSecond: writingSeconds > 0 ? +(tokens / writingSeconds).toFixed(1) : undefined,
      parts: partDurations.map((d) => Math.round(d)),
      sentences: sentences.length,
      referencesRemoved: pages.length < rawPages.length || pages.at(-1) !== rawPages[pages.length - 1],
    },
  };
}
