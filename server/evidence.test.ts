// Run with: npm test   (uses server/fixtures/sample-paper.pdf, built by make_sample_pdf.py)
import { readFileSync } from 'fs';
import assert from 'assert';
import { extractPaperText, checkPoint } from './evidence';

const pdf = readFileSync(process.argv[2] || new URL('./fixtures/sample-paper.pdf', import.meta.url));
const paper = await extractPaperText(pdf);
console.log(`pages=${paper.pages.length} chars=${paper.rawCharCount}`);

const cases: [string, Parameters<typeof checkPoint>[1], string, number, string[]?][] = [
  ['quote on cited page', { text: 'LSTM-AE best', page: 3, type: 'inferred', quote: 'The LSTM-AE achieved the best performance with an accuracy of 97.31%' }, 'verified', 3],
  ['wrong page is corrected', { text: 'Threshold', page: 1, type: 'explicit', quote: 'The threshold T is set to the 99.7% percentile of the reconstruction error' }, 'page_corrected', 2],
  ['fabricated quote', { text: 'x', page: 2, type: 'inferred', quote: 'Our transformer model reached perfect recall on all benchmarks' }, 'not_found', 2],
  ['Arabic text with correct numbers', { text: 'حقق النموذج دقة 97.31% و AUC بقيمة 0.812', page: 3, type: 'explicit', quote: 'accuracy of 97.31% and an AUC of 0.812' }, 'verified', 3, []],
  ['swapped/invented counts flagged', { text: 'تضم 36666 سارقاً و 3574 مستهلكاً نزيهاً', page: 2, type: 'explicit', quote: 'covers 1035 days and contains 38,757 normal consumers' }, 'verified', 2, ['36666', '3574']],
  ['real counts with comma pass', { text: 'Contains 38,757 normal consumers and 3615 thieves', page: 2, type: 'explicit', quote: '' }, 'no_quote', 2, []],
];

for (const [name, pt, status, page, nums] of cases) {
  const { check, page: p } = checkPoint(paper, pt);
  assert.equal(check.status, status, `${name}: status ${check.status}`);
  assert.equal(p, page, `${name}: page ${p}`);
  if (nums) assert.deepEqual(check.unmatchedNumbers ?? [], nums, `${name}: numbers ${check.unmatchedNumbers}`);
  console.log(`PASS  ${name}`);
}
