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
