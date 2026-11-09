/**
 * Section-by-section analysis on a local Ollama model.
 *
 * One huge JSON answer is slow on computers without a graphics card, and small models can
 * get stuck in it (endless whitespace or repetition). Instead the paper is analyzed in 11
 * short requests: the overview, then each of the 10 sections. Every request:
 *  - starts with the same system message (instructions + paper text), so Ollama reuses the
 *    paper it already read instead of reading it again,
 *  - asks for at most 3 short points with a size-limited JSON schema and an answer-length cap,
 *  - is watched for stalls and retried once; a section that still fails is marked as
 *    unavailable instead of blocking the whole analysis.
 */
import { OllamaMessage, OllamaStalledError, contextFor, ollamaChat, paperAsText, withoutReferences } from './ollama';

const SECTIONS: { id: number; ar: string; en: string; focus: string }[] = [
  { id: 1, ar: 'نظرة عامة على الورقة', en: 'Paper Overview', focus: 'what the paper is about, its scope and approach' },
  { id: 2, ar: 'المشكلة البحثية والفجوة المعرفية', en: 'Research Problem & Gap', focus: 'the research problem and the gap in prior work it addresses' },
  { id: 3, ar: 'الأهداف، الأسئلة البحثية والفرضيات', en: 'Objectives, Research Questions & Hypotheses', focus: 'the objectives, research questions and hypotheses' },
  { id: 4, ar: 'المساهمات العلمية الرئيسية', en: 'Main Contributions', focus: 'the main contributions claimed by the authors' },
  { id: 5, ar: 'المنهجية العلمية', en: 'Methodology', focus: 'the methodology, method design and procedure' },
  { id: 6, ar: 'البيانات، الأدوات، والنماذج', en: 'Data, Tools & Models', focus: 'the datasets (with exact sizes), tools, software and models used' },
  { id: 7, ar: 'النتائج والمناقشة', en: 'Results & Discussion', focus: 'the key results with their exact numbers and metrics, and how they are discussed' },
  { id: 8, ar: 'محددات وقصور البحث', en: 'Limitations', focus: 'limitations stated by the authors or evident from the design' },
  { id: 9, ar: 'التقييم النقدي (نقاط القوة والضعف)', en: 'Critical Evaluation (Strengths & Weaknesses)', focus: 'a critical evaluation: give strengths and weaknesses; set category to "strength" or "weakness" for every point' },
  { id: 10, ar: 'آفاق وتوجهات البحث المستقبلي', en: 'Future Research Directions', focus: 'future research directions stated or implied' },
];

const pointSchema = (critical: boolean) => ({
  type: 'object',
  properties: {
    points: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', maxLength: 260 },
          page: { type: 'integer' },
          type: { type: 'string', enum: ['explicit', 'inferred'] },
          quote: { type: 'string', maxLength: 200 },
          ...(critical ? { category: { type: 'string', enum: ['strength', 'weakness'] } } : {}),
        },
        required: ['text', 'page', 'type', 'quote', ...(critical ? ['category'] : [])],
      },
    },
  },
  required: ['points'],
});

const overviewSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', maxLength: 300 },
    authors: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 60 } },
    year: { type: 'string', maxLength: 10 },
    venue: { type: 'string', maxLength: 200 },
    field: { type: 'string', maxLength: 120 },
    summary: { type: 'string', maxLength: 700 },
  },
  required: ['title', 'authors', 'year', 'venue', 'field', 'summary'],
};

/** Parse JSON, falling back to rescuing complete point objects from a cut-off answer. */
function parseLenient(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const points = [...text.matchAll(/\{[^{}]*"text"[^{}]*\}/g)]
      .map((m) => {
        try {
          return JSON.parse(m[0]);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return points.length ? { points } : null;
  }
}

export interface LocalProgress {
  /** 'reading' until the model starts writing the first part. */
  stage: 'reading' | 'writing';
  /** Parts finished, out of 11 (overview + 10 sections). */
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
  const pagesForModel = withoutReferences(rawPages);
  const paper = paperAsText(pagesForModel);

  // Identical in every request, so Ollama keeps the paper in its cache after the first read.
  const system = `You are an expert academic peer reviewer. Analyze ONLY the research paper text below.
Rules:
- Write every "text" and "summary" in ${isAr ? 'Arabic (formal academic Arabic)' : 'English'}.
- Never invent facts, numbers, authors or citations. Copy numbers exactly and keep each number with its correct label.
- "page": the number from the [Page N] marker where the evidence appears.
- "type": "explicit" if the paper states it directly, "inferred" if it is your interpretation.
- "quote": a short verbatim quote copied from the paper in its original language (do not translate).
- Be concise: each point is one sentence.
=== PAPER TEXT ===${paper.text}
=== END OF PAPER ===`;

  const numCtx = contextFor(system.length, 900);
  const partsTotal = SECTIONS.length + 1;
  let partsDone = 0;
  let usedModel = model || '';
  let writingStarted = false;
  let tokens = 0;
  let writingSeconds = 0;
  const partDurations: number[] = [];

  let partFirstTokenAt = 0; // first token of the part in progress, for the live speed
  const report = (sectionTitle?: string) => {
    const liveSeconds = writingSeconds + (partFirstTokenAt ? (Date.now() - partFirstTokenAt) / 1000 : 0);
    const avg = partDurations.length > 1 ? partDurations.slice(1).reduce((a, b) => a + b, 0) / (partDurations.length - 1) : partDurations[0];
    onProgress({
      stage: writingStarted ? 'writing' : 'reading',
      partsDone,
      partsTotal,
      sectionTitle,
      etaSeconds: avg ? Math.round(avg * (partsTotal - partsDone)) : null,
      tokensPerSecond: liveSeconds > 1 ? +(tokens / liveSeconds).toFixed(1) : undefined,
      pages: paper.pagesIncluded,
    });
  };

  /** Run one part, retrying once if the model stalls or returns unusable JSON. */
  const ask = async (instruction: string, schema: object, numPredict: number, label: string) => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const started = Date.now();
      let partFirstToken = 0;
      let lastReport = 0;
      try {
        const messages: OllamaMessage[] = [
          { role: 'system', content: system },
          { role: 'user', content: instruction },
        ];
        const res = await ollamaChat(messages, schema, {
          model,
          numCtx,
          numPredict,
          // The first part also reads the paper, which can take many minutes on a slow PC;
          // the watchdog only counts time after the first token.
          stallSeconds: 90,
          onFirstToken: () => {
            partFirstToken = Date.now();
            partFirstTokenAt = partFirstToken;
            if (!writingStarted) {
              writingStarted = true;
              report(label);
            }
          },
          onProgress: () => {
            tokens++;
            const now = Date.now();
            if (now - lastReport > 1500) {
              lastReport = now;
              report(label);
            }
          },
        });
        usedModel = res.model;
        if (partFirstToken) writingSeconds += (Date.now() - partFirstToken) / 1000;
        partFirstTokenAt = 0;
        partDurations.push((Date.now() - started) / 1000);
        const parsed = parseLenient(res.text);
        if (parsed) return parsed;
        console.warn(`Local analysis: unusable JSON for "${label}" (attempt ${attempt})`);
      } catch (e) {
        if (partFirstToken) writingSeconds += (Date.now() - partFirstToken) / 1000;
        partFirstTokenAt = 0;
        if (!(e instanceof OllamaStalledError)) throw e;
        console.warn(`Local analysis: "${label}" stalled (attempt ${attempt})`);
      }
    }
    return null;
  };

  report();
  const overview =
    (await ask(
      `Give the paper overview as JSON: title, authors, year, venue (journal or conference), field, and a 2-3 sentence summary${isAr ? ' in Arabic' : ''}.`,
      overviewSchema,
      450,
      isAr ? 'نظرة عامة' : 'Overview'
    )) || { title: '', authors: [], year: '', venue: '', field: '', summary: '' };
  partsDone++;

  const sections: any[] = [];
  for (const sec of SECTIONS) {
    const title = isAr ? sec.ar : sec.en;
    report(title);
    const result = await ask(
      `Section "${sec.en}": give up to 3 points about ${sec.focus}. If the paper does not address this at all, return one point with text "${
        isAr ? 'غير مذكور في الورقة البحثية' : 'Not stated in the paper'
      }", page 1, type "inferred", quote "".`,
      pointSchema(sec.id === 9),
      sec.id === 9 ? 520 : 420,
      title
    );
    const points = Array.isArray(result?.points) ? result.points.filter((p: any) => p && typeof p.text === 'string') : [];
    if (!result) {
      // The model failed twice on this section: say so plainly instead of claiming the paper is silent.
      points.push({
        text: isAr
          ? 'تعذر تحليل هذا القسم على هذا الجهاز. أعد التحليل أو جرّب وضعاً آخر.'
          : 'This section could not be analyzed on this computer. Retry, or try another mode.',
        page: 1,
        type: 'inferred',
        quote: '',
      });
    }
    const notStated = !!result && (points.length === 0 || (points.length === 1 && /غير مذكور|not stated/i.test(points[0].text)));
    sections.push({ id: sec.id, title, isNotStated: notStated, points: notStated ? [] : points });
    partsDone++;
    report(title);
  }

  return {
    overview,
    sections,
    model: usedModel,
    truncatedAfterPage: paper.truncated ? paper.pagesIncluded : undefined,
    stats: {
      tokensPerSecond: writingSeconds > 0 ? +(tokens / writingSeconds).toFixed(1) : undefined,
      parts: partDurations.map((d) => Math.round(d)),
      referencesRemoved: pagesForModel.length < rawPages.length || pagesForModel.at(-1) !== rawPages[pagesForModel.length - 1],
    },
  };
}
