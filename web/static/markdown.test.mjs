// Node test for the docs renderer: block types, escaping, safe links, and every committed doc renders without loss.
// Run: node web/static/markdown.test.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { render, inline, slugify } from './markdown.js';

const DOCS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs');

assert.equal(inline('**Riichi** and *dora* `code` [x](https://a.b)'),
  '<strong>Riichi</strong> and <em>dora</em> <code>code</code> <a href="https://a.b" target="_blank" rel="noopener">x</a>');
assert.equal(inline('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
assert.equal(inline('[bad](javascript:alert(1))').includes('javascript:'), false);
assert.equal(inline('3 * 4 * 5'), '3 * 4 * 5');
assert.equal(slugify("Texas Hold'em — Rules"), 'texas-holdem-rules');

const { html, toc } = render(`# Title

Some *text*
continues here.

## Part 2
- one
- two
  - nested
1. first
2. second

| Hand | Rank |
|------|------|
| Pair | 1 |

> quoted

---

\`\`\`
<raw> code
\`\`\``);
assert.deepEqual(toc.map(t => [t.level, t.id]), [[1, 'title'], [2, 'part-2']]);
assert.match(html, /<p>Some <em>text<\/em> continues here\.<\/p>/);
assert.match(html, /<ul><li>one<\/li><li>two<ul><li>nested<\/li><\/ul><\/li><\/ul>/);
assert.match(html, /<ol><li>first<\/li><li>second<\/li><\/ol>/);
assert.match(html, /<th>Hand<\/th><th>Rank<\/th><\/tr><\/thead><tbody><tr><td>Pair<\/td><td>1<\/td>/);
assert.match(html, /<blockquote><p>quoted<\/p><\/blockquote>/);
assert.match(html, /<hr>/);
assert.match(html, /<pre><code>&lt;raw&gt; code<\/code><\/pre>/);

// Every committed document renders, keeps all its headings, and loses no text (word counts agree to 0.5%: list numbering and link targets account for the rest).
const words = s => s.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).length;
const htmlWords = s => words(s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
let n = 0;
for (const f of readdirSync(DOCS).filter(f => f.endsWith('.md'))) {
  const md = readFileSync(path.join(DOCS, f), 'utf8');
  const r = render(md);
  const headings = md.split('\n').filter(l => /^#{1,3}\s/.test(l)).length;
  assert.equal(r.toc.length, headings, f);
  const plain = md.replace(/^\s*([-*+]|\d+[.)]|#{1,6}|>)\s/gm, ' ').replace(/^\|?\s*:?-{2,}.*$/gm, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, ' ');
  const lost = words(plain) - htmlWords(r.html);
  assert.ok(Math.abs(lost) <= Math.max(10, words(plain) / 200), `${f}: word count differs by ${lost}`);
  n++;
}
assert.equal(n, 14);
console.log(`markdown: ok (${n} docs)`);
