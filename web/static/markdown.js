// Small dependency-free Markdown renderer for the docs library: headings, paragraphs, lists (two levels), tables,
// fenced code, block quotes, rules, and inline bold/italic/code/links. All text is HTML-escaped first.
import { esc } from './core.js';

export function slugify(s) {
  return String(s).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

export function inline(s) {
  const codes = [];
  let t = esc(s).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => {
    const safe = /^(https?:|#|mailto:)/.test(href) ? href : '#';
    const ext = /^https?:/.test(safe) ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${safe}"${ext}>${txt}</a>`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

export function render(md) {
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const out = [], toc = [];
  let i = 0;
  const isBlockStart = l => /^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|\|)/.test(l) || /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line))) {
      const lvl = m[1].length, id = slugify(m[2]);
      if (lvl <= 3) toc.push({ level: lvl, text: m[2], id });
      out.push(`<h${lvl} id="${id}">${inline(m[2])}</h${lvl}>`); i++; continue;
    }
    if (/^```/.test(line)) {
      const body = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++; out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`); continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^>/.test(line)) {
      const body = [];
      while (i < lines.length && /^>/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${render(body.join('\n')).html}</blockquote>`); continue;
    }
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = cells(line); i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<div class="scroll"><table><thead><tr>${head.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${
        rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s/.test(lines[i])) {
        const indent = /^\s*/.exec(lines[i])[0].length, ordered = /^\s*\d/.test(lines[i]);
        if (items.length && indent <= items[0].indent && ordered !== items[0].ordered) break; // ul -> ol: new list
        items.push({ indent, ordered, text: lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, '') }); i++;
        while (i < lines.length && lines[i].trim() && !/^\s*([-*+]|\d+[.)])\s/.test(lines[i]) && !isBlockStart(lines[i])) {
          items[items.length - 1].text += ' ' + lines[i++].trim();
        }
      }
      out.push(listHtml(items)); continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) para.push(lines[i++].trim());
    if (!para.length) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return { html: out.join('\n'), toc };
}

function listHtml(items) {
  const base = items[0].indent, tag = items[0].ordered ? 'ol' : 'ul';
  let html = `<${tag}>`, open = false;
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.indent > base) {
      const sub = [];
      while (k < items.length && items[k].indent > base) sub.push(items[k++]);
      k--; html += listHtml(sub); continue;
    }
    if (open) html += '</li>';
    html += `<li>${inline(it.text)}`; open = true;
  }
  return html + (open ? '</li>' : '') + `</${tag}>`;
}
