// Static-site data layer: answers api() GETs from the JSON files exported by scripts/build_static.py
// (api/info.json, api/games.json, api/docs.json, api/docs/<slug>.json). The site has no POST endpoints.
const files = new Map();
function file(rel) {
  if (!files.has(rel)) {
    files.set(rel, fetch('api/' + rel + '.json').then(r => { if (!r.ok) throw new Error(`${r.status} ${rel}`); return r.json(); }));
  }
  return files.get(rel);
}

export async function staticApi(path, body) {
  if (body) throw new Error('This static site has no server-side actions.');
  return file(path.split('?')[0].replace(/^\/+/, ''));
}
