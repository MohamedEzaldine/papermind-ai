// Run with: npm test
import assert from 'assert';
import { splitSentences, selectSentences, dedupe, hasForeignScript } from './retrieval';
import { withoutReferences } from './ollama';

const pages = [
  `A semi-supervised approach for electricity theft monitoring: A use case in Cyprus
Abstract—Electricity theft is a major source of non-technical losses for utilities. Most existing approaches require labeled data, which is costly and rarely available in practice. In this work, we propose a semi-supervised framework based on autoencoders that requires no prior knowledge of thieves during training.`,
  `The training data is the daily residential consumption in Cyprus from 27 January 2020 to 26 February 2022. The evaluation uses the State Grid Corporation of China dataset with 1035 days, 3574 non-theft and 36666 theft consumers. The decision threshold is set to the 99.7% percentile of the reconstruction error. We compare Conv-AE, LSTM-AE and GRU-AE architectures implemented in TensorFlow and served with Triton Inference Server.`,
  `LSTM-AE achieved the best performance with an accuracy of 97.31% and an AUC of 0.812. However, labeled data from the Cyprus pilot site was not available, so the full system could not be evaluated locally. In future work, we will evaluate the complete infrastructure and explore variational autoencoders with multiple adaptive thresholds.
References
[1] A. Author, Some paper, 2020.`,
];

const sentences = splitSentences(withoutReferences(pages));
assert.ok(sentences.length >= 9, `sentences: ${sentences.length}`);
assert.ok(!sentences.some((s) => s.text.includes('[1] A. Author')), 'references must be removed');
assert.equal(sentences.find((s) => s.text.includes('97.31%'))!.page, 3);
console.log(`PASS  split into ${sentences.length} sentences with pages, references removed`);

const has = (sec: number, needle: string) => selectSentences(sentences, sec, 5).some((s) => s.text.includes(needle));
assert.ok(has(2, 'require labeled data'), 'problem/gap should find the labeled-data problem');
assert.ok(has(6, '36666 theft'), 'data section should find dataset sizes');
assert.ok(has(7, '97.31%'), 'results should find the metrics');
assert.ok(has(8, 'not available'), 'limitations should find the stated limitation');
assert.ok(has(10, 'future work'), 'future work should be found');
console.log('PASS  each section finds its relevant sentences');

const d = dedupe([
  { text: 'LSTM-AE achieved the best AUC of 0.812.' },
  { text: 'The best AUC of 0.812 was achieved by LSTM-AE.' },
  { text: 'Labeled data from Cyprus was not available.' },
]);
assert.equal(d.length, 2);
console.log('PASS  near-duplicate points removed');

assert.equal(hasForeignScript('كشف سرقة الكهرباء في كипري'), true);
assert.equal(hasForeignScript('حقق نموذج LSTM-AE دقة 97.31%'), false);
console.log('PASS  broken-script translations detected');

import { cleanPointText, numbersSupported, goodArabicTranslation } from './retrieval';
assert.equal(
  cleanPointText('The dataset contains 42372 customers over 1035 days (S51 | p.2, S63 | p.2).'),
  'The dataset contains 42372 customers over 1035 days.'
);
assert.equal(cleanPointText('حقق النموذج دقة 97.14٪ (س118).'), 'حقق النموذج دقة 97.14٪.');
assert.equal(cleanPointText('1. الثبات: نتائج عالية (ص: 56 | صفحه 2)'), 'الثبات: نتائج عالية');
console.log('PASS  excerpt ids and numbering removed from point text');

const ev = 'The evaluation uses a dataset with 1035 days, 3574 non-theft and 36666 theft consumers.';
assert.equal(numbersSupported('The dataset covers 1035 days and 36,666 theft consumers.', ev), true);
assert.equal(numbersSupported('The dataset covers 9,655 consumers over 147 weeks.', ev), false);
assert.equal(numbersSupported('Three architectures were compared.', ev), true);
console.log('PASS  invented numbers detected against the cited sentence');

const en = 'LSTM-AE achieved the best AUC of 0.812 on the labeled dataset.';
assert.equal(goodArabicTranslation(en, 'حقق نموذج LSTM-AE أفضل قيمة AUC بلغت 0.812 على مجموعة البيانات المصنفة.'), true);
assert.equal(goodArabicTranslation(en, 'حقق نموذج LSTM-AE أفضل desekte بلغت 0.812.'), false);
assert.equal(goodArabicTranslation(en, 'البيانات المcollected لنموذج LSTM-AE بلغت 0.812.'), false);
assert.equal(goodArabicTranslation(en, 'حقق نموذج LSTM-AE أفضل قيمة AUC بلغت 0.92.'), false);
assert.equal(goodArabicTranslation(en, 'سرقة في кипри 0.812'), false);
console.log('PASS  bad translations rejected, good ones kept');

assert.equal(cleanPointText('{1}. طورنا نموذجاً بدقة عالية'), 'طورنا نموذجاً بدقة عالية');
assert.equal(cleanPointText('2. الضعف: نقص في التقييم'), 'نقص في التقييم');
assert.equal(cleanPointText('Strength: The framework needs no labels.'), 'The framework needs no labels.');
const en2 = 'The authors aim to propose a new framework for electricity theft detection in Cyprus.';
assert.equal(goodArabicTranslation(en2, 'يهدف المؤلفون إلى اقتراح إطار عمل جديد لكشف سرقة الكهرباء في Cyprus.'), true);
assert.equal(goodArabicTranslation(en2, 'aims إلى تقديم إطار جديد للكشف عن سرقة الكهرباء في Cyprus.'), false);
assert.equal(goodArabicTranslation(en2, 'أعد.authors تقييم الإطار المقترح لكشف السرقة في Cyprus.'), false);
assert.equal(goodArabicTranslation(en2, 'وعيا'), false);
console.log('PASS  numbering, category prefixes, plain English words and empty translations handled');
