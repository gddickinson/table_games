#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read index.html to get the script load order
const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script src="([^"]+)"><\/script>/g;
const scripts = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  scripts.push(match[1]);
}

console.log(`Found ${scripts.length} scripts in index.html`);

// Split into critical (loaded immediately) and lazy (loaded on demand)
const LAZY_MODULES = [
  'tile-editor', 'mod-system', 'replay-theater', 'spectator',
  'spectator-stream', 'puzzle-creator', 'community', 'cloud-sync',
  'native-app', 'ai-evolution', 'music-advanced', 'tournament',
  'hand-history', 'leaderboards', 'player-house', 'story-scenes'
];

const critical = [];
const lazy = [];

for (const src of scripts) {
  const name = path.basename(src, '.js');
  if (LAZY_MODULES.some(m => name.includes(m))) {
    lazy.push(src);
  } else {
    critical.push(src);
  }
}

// Build critical bundle
const distDir = 'dist';
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

let criticalBundle = '/* Table Game Simulator - Critical Bundle */\n';
let criticalSize = 0;
for (const src of critical) {
  try {
    const code = fs.readFileSync(src, 'utf8');
    criticalBundle += `\n/* === ${src} === */\n${code}\n`;
    criticalSize += code.length;
  } catch(e) {
    console.warn(`  Warning: ${src} not found, skipping`);
  }
}
fs.writeFileSync(path.join(distDir, 'bundle.js'), criticalBundle);

// Build lazy bundle
let lazyBundle = '/* Table Game Simulator - Lazy Bundle */\n';
let lazySize = 0;
for (const src of lazy) {
  try {
    const code = fs.readFileSync(src, 'utf8');
    lazyBundle += `\n/* === ${src} === */\n${code}\n`;
    lazySize += code.length;
  } catch(e) {
    console.warn(`  Warning: ${src} not found, skipping`);
  }
}
fs.writeFileSync(path.join(distDir, 'bundle-lazy.js'), lazyBundle);

// Generate production index.html
let prodHtml = html;
// Replace all individual scripts with bundles
const firstScript = scripts[0];
const lastScript = scripts[scripts.length - 1];
const scriptSection = html.substring(
  html.indexOf(`<script src="${firstScript}">`),
  html.indexOf(`<script src="${lastScript}">`) + `<script src="${lastScript}"></script>`.length
);
prodHtml = prodHtml.replace(scriptSection,
  `<script src="dist/bundle.js"></script>\n  <script src="dist/bundle-lazy.js" defer></script>`
);
fs.writeFileSync(path.join(distDir, 'index.html'), prodHtml);

// Copy CSS
const cssDir = 'css';
const distCssDir = path.join(distDir, 'css');
if (!fs.existsSync(distCssDir)) fs.mkdirSync(distCssDir);
for (const css of fs.readdirSync(cssDir)) {
  const srcPath = path.join(cssDir, css);
  if (fs.statSync(srcPath).isFile()) {
    fs.copyFileSync(srcPath, path.join(distCssDir, css));
  }
}

console.log(`\nBuild complete:`);
console.log(`  Critical: ${critical.length} files -> dist/bundle.js (${(criticalSize/1024).toFixed(0)} KB)`);
console.log(`  Lazy: ${lazy.length} files -> dist/bundle-lazy.js (${(lazySize/1024).toFixed(0)} KB)`);
console.log(`  Production HTML -> dist/index.html`);
