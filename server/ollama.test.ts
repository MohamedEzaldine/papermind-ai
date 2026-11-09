// Run with: npm test
import assert from 'assert';
import { withoutReferences, paperAsText } from './ollama';

// The reference list is removed from the page where it starts, and later pages are dropped.
const pages = ['Intro text', 'Method and results', 'Conclusion here.\nReferences\n[1] A. Author, 2020.', '[2] More refs'];
const cut = withoutReferences(pages);
assert.equal(cut.length, 3);
assert.equal(cut[2].trim(), 'Conclusion here.');
console.log('PASS  references removed');

// A numbered heading ("7. REFERENCES") is also recognized.
assert.equal(withoutReferences(['a', 'b\n7. REFERENCES\nx']).at(-1)!.trim(), 'b');
console.log('PASS  numbered references heading');

// Papers without a reference heading are untouched; the word inside a sentence does not count.
const noRefs = ['a', 'see the references in [3] for details'];
assert.deepEqual(withoutReferences(noRefs), noRefs);
console.log('PASS  no false cut');

// Page markers are kept so the model can cite pages.
assert.match(paperAsText(['one', 'two']).text, /\[Page 1\][\s\S]*\[Page 2\]/);
console.log('PASS  page markers');
