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
