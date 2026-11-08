/**
 * Evidence verification for PaperMind AI.
 *
 * Gemini reads the PDF and returns points with a page number and a supporting
 * quote. Language models sometimes cite the wrong page, paraphrase a "quote",
 * or swap numbers. This module extracts the real text of every page and checks
 * each point against it, so the dashboard can show which evidence was confirmed.
 */
import { extractText, getDocumentProxy } from 'unpdf';

export type EvidenceStatus = 'verified' | 'page_corrected' | 'not_found' | 'no_quote';

export interface EvidenceCheck {
  status: EvidenceStatus;
  /** Page the model originally cited, set only when the quote was found on a different page. */
  citedPage?: number;
  /** Numbers in an explicit point that do not appear anywhere in the paper. */
  unmatchedNumbers?: string[];
}

export interface PaperText {
  rawPages: string[]; // original extracted text per page (index 0 = page 1)
  pages: string[]; // normalized text per page (index 0 = page 1)
  fullText: string; // normalized text of the whole paper
  numberSet: Set<string>; // every number that appears in the paper
  rawCharCount: number;
}

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_INDIC.indexOf(d);
    return String(i >= 0 ? i : EXTENDED_ARABIC_INDIC.indexOf(d));
  });
}

/** Lowercase, unify unicode, join hyphenated line breaks, keep only letters/digits. */
export function normalizeText(s: string): string {
  return toLatinDigits(s.normalize('NFKC'))
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '') // Arabic diacritics
    .replace(/(\w)-\s+(\w)/g, '$1$2') // "detec- tion" -> "detection"
    .replace(/[‘’“”'"`]/g, '')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ')
    .replace(/\.(?!\d)/g, ' ') // drop sentence periods, keep decimal points
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract numbers like 97.31, 36,666 or 0.05 and return them without thousands separators. */
export function extractNumbers(s: string): string[] {
  const matches = toLatinDigits(s).match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) || [];
  return matches.map((m) => m.replace(/,/g, '').replace(/\.0+$/, ''));
}

export async function extractPaperText(pdf: Buffer): Promise<PaperText> {
  const doc = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(doc, { mergePages: false });
  const rawPages = Array.isArray(text) ? text : [text];
  const pages = rawPages.map(normalizeText);
  const rawCharCount = rawPages.reduce((n, p) => n + p.replace(/\s/g, '').length, 0);
  const numberSet = new Set<string>();
  for (const p of rawPages) for (const n of extractNumbers(p)) numberSet.add(n);
  return { rawPages, pages, fullText: pages.join(' '), numberSet, rawCharCount };
}

function trigrams(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + 2 < words.length; i++) out.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  return out;
}

/** Share (0..1) of the quote's word trigrams that appear on the page. Tolerates small extraction differences. */
function quoteCoverage(quote: string, pageText: string): number {
  if (pageText.includes(quote)) return 1;
  const qWords = quote.split(' ');
  const qTri = trigrams(qWords);
  if (qTri.length === 0) return 0;
  const pageTri = new Set(trigrams(pageText.split(' ')));
  return qTri.filter((t) => pageTri.has(t)).length / qTri.length;
}

const MATCH_THRESHOLD = 0.7;

export function checkPoint(
  paper: PaperText,
  point: { text: string; page: number; type: string; quote?: string }
): { check: EvidenceCheck; page: number } {
  const check: EvidenceCheck = { status: 'no_quote' };
  let page = point.page;

  const quote = point.quote ? normalizeText(point.quote) : '';
  if (quote.split(' ').length >= 4) {
    const cited = paper.pages[page - 1];
    if (cited !== undefined && quoteCoverage(quote, cited) >= MATCH_THRESHOLD) {
      check.status = 'verified';
    } else {
      let bestPage = -1;
      let bestScore = 0;
      paper.pages.forEach((p, i) => {
        const score = quoteCoverage(quote, p);
        if (score > bestScore) {
          bestScore = score;
          bestPage = i + 1;
        }
      });
      if (bestScore >= MATCH_THRESHOLD) {
        check.status = 'page_corrected';
        check.citedPage = page;
        page = bestPage;
      } else {
        check.status = 'not_found';
      }
    }
  }

  // Numbers stated as explicit facts must exist somewhere in the paper.
  if (point.type === 'explicit') {
    const unmatched = extractNumbers(point.text).filter((n) => {
      if (paper.numberSet.has(n)) return false;
      // A percentage like 97.31 may appear in the paper as 0.9731, and vice versa.
      const asNum = Number(n);
      if (paper.numberSet.has(String(+(asNum / 100).toFixed(6)))) return false;
      if (paper.numberSet.has(String(+(asNum * 100).toFixed(6)))) return false;
      return true;
    });
    if (unmatched.length > 0) check.unmatchedNumbers = unmatched;
  }

  return { check, page };
}
