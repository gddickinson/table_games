/**
 * doc-viewer.js — In-browser Markdown documentation viewer with search
 * Renders .md files from docs/ with navigation menu, full-text search, and table of contents.
 */
(function () {
  'use strict';
  window.MJ = window.MJ || {};

  const DOCS = [
    { id: 'rulebook', title: 'Mahjong Rulebook', icon: '🀄', file: 'docs/rulebook.md', description: 'Complete Mahjong rules and scoring' },
    { id: 'tutorial', title: 'Mahjong Tutorial', icon: '🎓', file: 'docs/tutorial.md', description: 'Step-by-step Mahjong guide for beginners' },
    { id: 'history', title: 'Mahjong History', icon: '📜', file: 'docs/history.md', description: 'The rich history of Mahjong' },
    { id: 'help', title: 'Game Help', icon: '❓', file: 'docs/game-help.md', description: 'Complete guide to all game features' },
    { id: 'strategy', title: 'Mahjong Strategy', icon: '🧠', file: 'docs/strategy-guide.md', description: 'Advanced Mahjong tips and tactics' },
    { id: 'poker-rules', title: 'Poker Rulebook', icon: '🃏', file: 'docs/poker-rulebook.md', description: 'Complete Texas Hold\'em rules' },
    { id: 'poker-strategy', title: 'Poker Strategy', icon: '♠️', file: 'docs/poker-strategy.md', description: 'Poker strategy and hand analysis' },
    { id: 'blackjack-rules', title: 'Blackjack Rulebook', icon: '🂡', file: 'docs/blackjack-rulebook.md', description: 'Complete Blackjack rules and payouts' },
    { id: 'blackjack-strategy', title: 'Blackjack Strategy', icon: '📊', file: 'docs/blackjack-strategy.md', description: 'Basic strategy charts and card counting' },
    { id: 'dominoes-rules', title: 'Dominoes Rulebook', icon: '🁣', file: 'docs/dominoes-rulebook.md', description: 'Complete Block Dominoes rules' },
    { id: 'dominoes-strategy', title: 'Dominoes Strategy', icon: '🎯', file: 'docs/dominoes-strategy.md', description: 'Tile counting and blocking tactics' }
  ];

  let overlay = null;
  let currentDoc = null;
  let docCache = {};
  let searchIndex = {};

  // === Minimal Markdown Parser ===
  function parseMarkdown(md) {
    let html = md
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Headers
      .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
      .replace(/^####\s+(.+)$/gm, '<h4 id="$1">$1</h4>')
      .replace(/^###\s+(.+)$/gm, '<h3 id="$1">$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2 id="$1">$1</h2>')
      .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Blockquotes
      .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr>')
      // Images (not used but safe)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Tables
      .replace(/^\|(.+)\|$/gm, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        if (cells.every(c => /^[\s-:]+$/.test(c))) return ''; // separator row
        const tag = match.includes('---') ? 'th' : 'td';
        return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
      })
      // Unordered lists
      .replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      // Paragraphs (lines not already tagged)
      .replace(/^(?!<[hpuolbtdri]|<\/|<li|<code|<pre|<block|<hr|<tr)(.+)$/gm, '<p>$1</p>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
      if (!match.startsWith('<ul>')) return '<ul>' + match + '</ul>';
      return match;
    });
    // Wrap consecutive <tr> in <table>
    html = html.replace(/(<tr>[\s\S]*?<\/tr>(\s*<tr>[\s\S]*?<\/tr>)*)/g, '<table>$1</table>');
    // Clean up nested <ul>
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    return html;
  }

  // === Table of Contents ===
  function extractTOC(html) {
    const toc = [];
    const regex = /<h([2-4])\s*(?:id="([^"]*)")?[^>]*>([^<]+)<\/h[2-4]>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const id = match[2] || match[3].replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
      toc.push({ level, id, text: match[3] });
    }
    return toc;
  }

  // === Search Index ===
  function buildSearchIndex(docId, text) {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const index = {};
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!index[word]) index[word] = [];
      index[word].push(i);
    }
    searchIndex[docId] = { words, index, text };
  }

  function search(query) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) return [];

    const results = [];
    for (const [docId, data] of Object.entries(searchIndex)) {
      let score = 0;
      const snippets = [];

      for (const term of terms) {
        // Check exact word matches
        if (data.index[term]) {
          score += data.index[term].length * 10;
          // Get context snippet
          const pos = data.index[term][0];
          const start = Math.max(0, pos - 8);
          const end = Math.min(data.words.length, pos + 12);
          snippets.push('...' + data.words.slice(start, end).join(' ') + '...');
        }
        // Check partial matches
        for (const [word, positions] of Object.entries(data.index)) {
          if (word.includes(term) && word !== term) {
            score += positions.length * 3;
          }
        }
      }

      if (score > 0) {
        const doc = DOCS.find(d => d.id === docId);
        results.push({
          docId, title: doc ? doc.title : docId, icon: doc ? doc.icon : '📄',
          score, snippet: snippets[0] || ''
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 20);
  }

  // === Fetch Document ===
  async function loadDoc(docId) {
    if (docCache[docId]) return docCache[docId];
    const doc = DOCS.find(d => d.id === docId);
    if (!doc) return null;

    try {
      const response = await fetch(doc.file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const html = parseMarkdown(text);
      const toc = extractTOC(html);
      docCache[docId] = { id: docId, title: doc.title, icon: doc.icon, raw: text, html, toc };
      buildSearchIndex(docId, text);
      return docCache[docId];
    } catch (e) {
      return { id: docId, title: doc.title, icon: doc.icon, raw: '', html: `<p>Could not load ${doc.file}: ${e.message}</p>`, toc: [] };
    }
  }

  // === UI ===
  function show(initialDocId) {
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'doc-viewer';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:400;display:flex;font-family:system-ui,sans-serif;';

    // Sidebar
    const sidebar = document.createElement('div');
    sidebar.style.cssText = 'width:260px;background:#0d1f14;border-right:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;';
    sidebar.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid rgba(255,255,255,0.1);">
        <h2 style="color:#e8b830;margin:0 0 8px;font-size:18px;">Documentation</h2>
        <input id="doc-search" type="text" placeholder="Search all docs..." style="width:100%;padding:8px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#e0e0e0;font-size:13px;outline:none;" />
      </div>
      <div id="doc-search-results" style="display:none;flex:1;overflow-y:auto;padding:8px;"></div>
      <div id="doc-menu" style="flex:1;overflow-y:auto;padding:8px;"></div>
      <div id="doc-toc" style="border-top:1px solid rgba(255,255,255,0.1);max-height:200px;overflow-y:auto;padding:8px;display:none;"></div>
    `;
    overlay.appendChild(sidebar);

    // Content area
    const content = document.createElement('div');
    content.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
    content.innerHTML = `
      <div style="padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
        <span id="doc-breadcrumb" style="color:#a0a0a0;font-size:13px;">Select a document</span>
        <button id="doc-close" style="padding:4px 12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#e0e0e0;cursor:pointer;font-size:13px;">Close (Esc)</button>
      </div>
      <div id="doc-content" style="flex:1;overflow-y:auto;padding:24px 32px;color:#d0d0d0;line-height:1.8;font-size:15px;max-width:900px;"></div>
    `;
    overlay.appendChild(content);

    document.body.appendChild(overlay);

    // Build menu
    const menuEl = document.getElementById('doc-menu');
    for (const doc of DOCS) {
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:4px;transition:background 0.15s;';
      item.innerHTML = `<div style="font-size:14px;color:#e0e0e0;">${doc.icon} ${doc.title}</div><div style="font-size:11px;color:#888;margin-top:2px;">${doc.description}</div>`;
      item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.06)');
      item.addEventListener('mouseleave', () => item.style.background = 'transparent');
      item.addEventListener('click', () => openDoc(doc.id));
      menuEl.appendChild(item);
    }

    // Search
    const searchInput = document.getElementById('doc-search');
    const searchResults = document.getElementById('doc-search-results');
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (query.length < 2) {
        searchResults.style.display = 'none';
        menuEl.style.display = '';
        return;
      }
      const results = search(query);
      searchResults.style.display = '';
      menuEl.style.display = 'none';
      searchResults.innerHTML = results.length === 0
        ? '<div style="color:#888;padding:12px;text-align:center;">No results found</div>'
        : results.map(r => `
          <div class="doc-search-result" data-doc="${r.docId}" style="padding:8px 10px;border-radius:6px;cursor:pointer;margin-bottom:4px;background:rgba(255,255,255,0.03);">
            <div style="font-size:13px;color:#e0e0e0;">${r.icon} ${r.title}</div>
            <div style="font-size:11px;color:#888;margin-top:2px;">${r.snippet}</div>
          </div>
        `).join('');
      searchResults.querySelectorAll('.doc-search-result').forEach(el => {
        el.addEventListener('click', () => {
          openDoc(el.dataset.doc);
          searchInput.value = '';
          searchResults.style.display = 'none';
          menuEl.style.display = '';
        });
      });
    });

    // Close
    document.getElementById('doc-close').addEventListener('click', hide);
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    overlay.setAttribute('tabindex', '0');
    overlay.focus();

    // Load initial doc or show welcome
    if (initialDocId) {
      openDoc(initialDocId);
    } else {
      // Preload all docs for search
      Promise.all(DOCS.map(d => loadDoc(d.id)));
      document.getElementById('doc-content').innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <h1 style="color:#e8b830;font-size:36px;margin-bottom:16px;">📖 Mahjong Documentation</h1>
          <p style="font-size:16px;color:#a0a0a0;max-width:500px;margin:0 auto;">
            Complete rulebook, tutorial for beginners, game history, strategy guide, and full feature help.
            Select a document from the menu or use the search bar.
          </p>
        </div>
      `;
    }
  }

  async function openDoc(docId) {
    const doc = await loadDoc(docId);
    if (!doc) return;
    currentDoc = doc;

    // Update breadcrumb
    document.getElementById('doc-breadcrumb').textContent = `${doc.icon} ${doc.title}`;

    // Render content
    const contentEl = document.getElementById('doc-content');
    contentEl.innerHTML = doc.html;
    contentEl.scrollTop = 0;

    // Style the content
    injectContentStyles(contentEl);

    // Build TOC
    const tocEl = document.getElementById('doc-toc');
    if (doc.toc.length > 0) {
      tocEl.style.display = '';
      tocEl.innerHTML = '<div style="font-size:11px;color:#e8b830;margin-bottom:4px;font-weight:600;">TABLE OF CONTENTS</div>' +
        doc.toc.map(t => `
          <div data-anchor="${t.id}" style="padding:2px ${4 + (t.level - 2) * 12}px;font-size:${14 - t.level}px;color:#a0a0a0;cursor:pointer;border-radius:4px;"
               onmouseenter="this.style.color='#e0e0e0'" onmouseleave="this.style.color='#a0a0a0'">
            ${t.text}
          </div>
        `).join('');
      tocEl.querySelectorAll('[data-anchor]').forEach(el => {
        el.addEventListener('click', () => {
          const target = contentEl.querySelector(`#${CSS.escape(el.dataset.anchor)}`);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    } else {
      tocEl.style.display = 'none';
    }

    // Highlight search term if applicable
    const searchInput = document.getElementById('doc-search');
    if (searchInput && searchInput.value.trim().length >= 2) {
      highlightText(contentEl, searchInput.value.trim());
    }

    // Preload other docs for search
    Promise.all(DOCS.map(d => loadDoc(d.id)));
  }

  function highlightText(container, term) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (regex.test(node.textContent)) {
        const span = document.createElement('span');
        span.innerHTML = node.textContent.replace(regex, '<mark style="background:#e8b830;color:#000;padding:1px 2px;border-radius:2px;">$1</mark>');
        node.parentNode.replaceChild(span, node);
      }
    }
  }

  function injectContentStyles(container) {
    // Apply nice styling to rendered markdown content
    container.querySelectorAll('h1').forEach(el => el.style.cssText = 'color:#e8b830;font-size:28px;margin:24px 0 12px;border-bottom:2px solid rgba(232,184,48,0.3);padding-bottom:8px;');
    container.querySelectorAll('h2').forEach(el => el.style.cssText = 'color:#e8b830;font-size:22px;margin:20px 0 10px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:6px;');
    container.querySelectorAll('h3').forEach(el => el.style.cssText = 'color:#a0d8a0;font-size:18px;margin:16px 0 8px;');
    container.querySelectorAll('h4').forEach(el => el.style.cssText = 'color:#8bc8e8;font-size:15px;margin:12px 0 6px;');
    container.querySelectorAll('table').forEach(el => el.style.cssText = 'border-collapse:collapse;width:100%;margin:12px 0;');
    container.querySelectorAll('th,td').forEach(el => el.style.cssText = 'border:1px solid rgba(255,255,255,0.15);padding:6px 10px;text-align:left;font-size:13px;');
    container.querySelectorAll('th').forEach(el => el.style.cssText += 'background:rgba(232,184,48,0.1);color:#e8b830;font-weight:600;');
    container.querySelectorAll('code').forEach(el => {
      if (el.parentElement.tagName !== 'PRE') el.style.cssText = 'background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-size:13px;color:#a0d8a0;';
    });
    container.querySelectorAll('pre').forEach(el => el.style.cssText = 'background:rgba(0,0,0,0.4);padding:12px 16px;border-radius:8px;overflow-x:auto;margin:12px 0;font-size:13px;line-height:1.5;');
    container.querySelectorAll('blockquote').forEach(el => el.style.cssText = 'border-left:4px solid #e8b830;padding:8px 16px;margin:12px 0;background:rgba(232,184,48,0.05);color:#c0b090;font-style:italic;border-radius:0 8px 8px 0;');
    container.querySelectorAll('ul,ol').forEach(el => el.style.cssText = 'padding-left:24px;margin:8px 0;');
    container.querySelectorAll('li').forEach(el => el.style.cssText = 'margin-bottom:4px;');
    container.querySelectorAll('hr').forEach(el => el.style.cssText = 'border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;');
    container.querySelectorAll('a').forEach(el => el.style.cssText = 'color:#6bb8ff;text-decoration:none;');
    container.querySelectorAll('strong').forEach(el => el.style.cssText = 'color:#e0e0e0;');
  }

  function hide() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  function isOpen() { return !!overlay; }

  window.MJ.DocViewer = Object.freeze({
    show, hide, isOpen, search, DOCS, loadDoc
  });

  console.log('[Mahjong] DocViewer module loaded');
})();
