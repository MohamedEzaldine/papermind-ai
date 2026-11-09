/**
 * Finds the sentences of a paper that matter for each analysis section.
 *
 * Small local models lose track of details in a whole paper. Giving them a short, numbered
 * list of the most relevant sentences keeps them focused, makes them much faster on
 * computers without a graphics card, and lets them cite evidence by sentence id, so the
 * quote and page shown to the user always come from the paper itself.
 */

export interface Sentence {
  id: string; // "S12"
  page: number; // 1-based
  text: string;
  index: number; // position in the paper
}

/** Split pages into sentences of useful length, keeping their page numbers. */
export function splitSentences(rawPages: string[]): Sentence[] {
  const out: Sentence[] = [];
  rawPages.forEach((pageText, p) => {
    const flat = pageText
      .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2') // join hyphenated line breaks
      .replace(/\s*\n\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    // Split after . ! ? ؟ when followed by a capital letter, digit, quote, bracket or Arabic letter.
    const parts = flat.split(/(?<=[.!?؟])\s+(?=[A-Z0-9"“(\[؀-ۿ])/);
    for (const part of parts) {
      const text = part.trim();
      if (text.length < 35) continue;
      // Long fragments (tables, run-on extraction) are cut to a readable size.
      const clipped = text.length > 420 ? text.slice(0, 420).replace(/\s+\S*$/, '') + '…' : text;
      out.push({ id: `S${out.length + 1}`, page: p + 1, text: clipped, index: out.length });
    }
  });
  return out;
}

/** Keywords per section (English and Arabic). Stems match word starts, e.g. "limit" matches "limitation". */
const KEYWORDS: Record<number, string[]> = {
  1: ['propose', 'present', 'paper', 'this work', 'approach', 'framework', 'study', 'abstract', 'نقترح', 'تقدم', 'الدراسة', 'الورقة'],
  2: ['problem', 'challeng', 'issue', 'however', 'lack', 'limited', 'gap', 'existing', 'previous', 'prior', 'difficult', 'costly', 'expensive', 'require', 'few', 'motivat', 'unexplored', 'loss', 'مشكلة', 'تحدي', 'فجوة', 'نقص', 'الدراسات السابقة'],
  3: ['aim', 'objective', 'goal', 'purpose', 'propose', 'this paper', 'this work', 'investigat', 'hypothes', 'question', 'we ', 'seek', 'هدف', 'تهدف', 'فرضية', 'سؤال'],
  4: ['contribution', 'propose', 'novel', 'introduce', 'present', 'first', 'main', 'summar', 'develop', 'new', 'مساهم', 'جديد', 'نقترح'],
  5: ['method', 'approach', 'model', 'architecture', 'algorithm', 'procedure', 'framework', 'train', 'threshold', 'layer', 'step', 'design', 'encoder', 'decoder', 'loss', 'function', 'منهج', 'طريقة', 'خوارزمية', 'نموذج'],
  6: ['data', 'dataset', 'sample', 'collect', 'record', 'consumer', 'participant', 'period', 'tool', 'software', 'librar', 'implement', 'server', 'gpu', 'python', 'tensorflow', 'pytorch', 'docker', 'database', 'بيانات', 'عينة', 'أداة', 'برنامج'],
  7: ['result', 'accuracy', 'performance', 'achiev', 'outperform', 'table', 'auc', 'f1', 'precision', 'recall', 'error', 'improv', 'compar', 'best', 'score', 'nmse', 'rmse', 'نتائج', 'دقة', 'أداء'],
  8: ['limitation', 'limited', 'however', 'although', 'only', 'drawback', 'constraint', 'cannot', 'lack', 'assum', 'unavailab', 'not available', 'future', 'قيود', 'محدود', 'لكن', 'إلا أن'],
  9: ['propose', 'novel', 'outperform', 'best', 'however', 'limitation', 'only', 'imbalanc', 'assum', 'result', 'accuracy', 'contribution', 'قوة', 'ضعف'],
  10: ['future', 'further', 'plan', 'extend', 'extension', 'will', 'next', 'explor', 'investigat', 'conclusion', 'conclude', 'مستقبل', 'لاحق'],
};

/** Sections that benefit from sentences with numbers (sizes, metrics). */
const NUMBER_HEAVY = new Set([6, 7]);

const hasNumber = (t: string) => /\d+(?:[.,]\d+)?\s*%|\b\d{2,}(?:[.,]\d+)?\b|\b0?\.\d+\b/.test(t);

/** Pick the most relevant sentences for a section, returned in paper order. */
export function selectSentences(sentences: Sentence[], sectionId: number, limit = 12): Sentence[] {
  const words = KEYWORDS[sectionId] || [];
  const n = sentences.length;
  const scored = sentences.map((s) => {
    const lower = s.text.toLowerCase();
    let score = 0;
    for (const w of words) if (lower.includes(w)) score += 1;
    if (NUMBER_HEAVY.has(sectionId) && hasNumber(s.text)) score += 1.5;
    const pos = s.index / Math.max(1, n - 1);
    // Abstract and introduction state the problem, aims and contributions; the conclusion states future work.
    if ([1, 2, 3, 4].includes(sectionId) && pos < 0.3) score += 1;
    if ([8, 10].includes(sectionId) && pos > 0.7) score += 1;
    return { s, score };
  });
  const picked = scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.s.index - b.s.index)
    .slice(0, limit)
    .map((x) => x.s);
  // Fall back to the opening sentences if nothing matched (e.g. an unusual paper).
  const result = picked.length >= 3 ? picked : sentences.slice(0, limit);
  return result.sort((a, b) => a.index - b.index);
}

/** Format sentences for the model: one per line with id and page. */
export function formatExcerpts(sentences: Sentence[]): string {
  return sentences.map((s) => `[${s.id} | p.${s.page}] ${s.text}`).join('\n');
}

/** Drop points that say nearly the same thing (word overlap). */
export function dedupe<T extends { text: string }>(points: T[]): T[] {
  const tokens = (t: string) => new Set(t.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));
  const kept: { p: T; t: Set<string> }[] = [];
  for (const p of points) {
    const t = tokens(p.text);
    const dup = kept.some((k) => {
      const inter = [...t].filter((w) => k.t.has(w)).length;
      return inter / Math.max(1, Math.min(t.size, k.t.size)) > 0.7;
    });
    if (!dup) kept.push({ p, t });
  }
  return kept.map((k) => k.p);
}

/** True if text mixes in scripts that should never appear in Arabic or English output (Cyrillic, Greek, CJK...). */
export function hasForeignScript(text: string): boolean {
  return /[Ѐ-ӿͰ-Ͽ぀-ヿ一-鿿가-힯฀-๿]/.test(text);
}

/**
 * Remove artifacts small models leave in point text: excerpt ids and page tags such as
 * "(S51 | p.2)", "(س64)", "(ص: 56 | صفحه 2)", and list numbering like "1. ".
 */
export function cleanPointText(text: string): string {
  return text
    .replace(/[([]\s*(?:[Sس]\s*\d+|ص\s*[:.]?\s*\d+|p\.?\s*\d+|صفح[ةه]\s*\d+)[^)\]]*[)\]]/gi, '')
    .replace(/\b[Sس]\d+\b/g, '')
    .replace(/^\s*(?:\{\d+\}|\(\d+\)|\[\d+\]|\d+)\s*[.):-]?\s+/, '') // "1. ", "{1}. ", "(2) "
    .replace(/^\s*(?:strengths?|weakness(?:es)?|نقطة القوة|نقطة الضعف|القوة|الضعف|قوة|ضعف)\s*[:：-]\s*/i, '') // the category is shown separately
    .replace(/\s+([.,،؛:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Numbers in a text, ignoring small counts (1-10) that are usually words like "three models". */
export function significantNumbers(text: string): string[] {
  const latin = text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/٫/g, '.').replace(/٬/g, ',');
  const nums = (latin.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) || []).map((n) =>
    n.replace(/,/g, '')
  );
  return nums.filter((n) => !(Number.isInteger(Number(n)) && Number(n) <= 10));
}

/** True if every significant number in the point appears in its evidence sentence. */
export function numbersSupported(pointText: string, evidence: string): boolean {
  const have = new Set(significantNumbers(evidence));
  return significantNumbers(pointText).every((n) => have.has(n));
}

/**
 * Check a machine translation into Arabic. Rejects translations that:
 *  - contain broken scripts (Cyrillic, CJK...),
 *  - glue Latin letters onto Arabic letters ("المcollected"),
 *  - contain Latin words that are not in the English source (invented words like "desekte"),
 *  - change, drop or add numbers.
 */
export function goodArabicTranslation(english: string, arabic: string): boolean {
  if (!arabic || !/[؀-ۿ]/.test(arabic) || hasForeignScript(arabic)) return false;
  if (/[؀-ۿ][.,]?[A-Za-z]|[A-Za-z][.,]?[؀-ۿ]/.test(arabic)) return false;
  // Far shorter than the source means words were lost (e.g. a one-word "translation").
  if (arabic.length < english.length * 0.35) return false;
  // Latin words are allowed only as technical names (LSTM-AE, AUC, Cyprus), never as plain words ("aims", "authors").
  if ((arabic.match(/[A-Za-z][A-Za-z0-9-]*/g) || []).some((w) => /^[a-z]+$/.test(w))) return false;
  const sourceWords = new Set((english.toLowerCase().match(/[a-z][a-z0-9-]*/g) || []).map((w) => w.replace(/s$/, '')));
  const latinWords = arabic.toLowerCase().match(/[a-z][a-z0-9-]*/g) || [];
  if (latinWords.some((w) => !sourceWords.has(w) && !sourceWords.has(w.replace(/s$/, '')))) return false;
  const a = significantNumbers(arabic).sort().join(',');
  const e = significantNumbers(english).sort().join(',');
  return a === e;
}
