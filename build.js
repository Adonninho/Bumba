// Reconstrói bumba.html e bumba-html.js a partir de app.html (a app BUMBA legível) e de mapa.html.
// Uso: node build.js
const fs = require('fs');
const path = require('path');

const root = __dirname;
const appPath = path.join(root, 'app.html');
const bundlePath = path.join(root, 'bumba.html');
const jsPath = path.join(root, 'bumba-html.js');
const expoJsPath = path.join(root, 'bumba', 'bumba-html.js');

const app = fs.readFileSync(appPath, 'utf8');

// 1. Verificação de sintaxe do JavaScript da app (o <script type="text/x-dc">).
const m = app.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
if (!m) throw new Error('Não encontrei o <script type="text/x-dc"> em app.html');
try {
  new Function(m[1]);
} catch (e) {
  console.error('Erro de sintaxe no JavaScript de app.html:', e.message);
  process.exit(1);
}

// 2. Substituir a linha do template dentro de bumba.html.
const lines = fs.readFileSync(bundlePath, 'utf8').split('\n');
const lineAfter = tag => { const i = lines.findIndex(l => l.trim() === tag); if (i < 0) throw new Error('Não encontrei ' + tag + ' em bumba.html'); return i + 1; };
const idx = lineAfter('<script type="__bundler/template">') - 1;
// "</" fica como "</" para não fechar a tag <script> onde o template vive.
lines[idx + 1] = JSON.stringify(app).replace(/<\//g, '<\\u002F');

// 3. Fotos: cada fotos/<nome>.jpg entra no pacote como recurso "foto-<nome>",
//    que a app lê em window.__resources['foto-<nome>'].
const fotosDir = path.join(root, 'fotos');
const mIdx = lineAfter('<script type="__bundler/manifest">'), eIdx = lineAfter('<script type="__bundler/ext_resources">');
const manifest = JSON.parse(lines[mIdx]);
let ext = JSON.parse(lines[eIdx]);
for (const e of ext) if (e.id.startsWith('foto-')) delete manifest[e.uuid];
ext = ext.filter(e => !e.id.startsWith('foto-'));
const fotos = fs.existsSync(fotosDir) ? fs.readdirSync(fotosDir).filter(f => /\.jpe?g$/i.test(f)).sort() : [];
for (const f of fotos) {
  const key = f.replace(/\.jpe?g$/i, '');
  const h = require('crypto').createHash('md5').update('bumba-foto-' + key).digest('hex');
  const uuid = h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-a' + h.slice(17, 20) + '-' + h.slice(20, 32);
  manifest[uuid] = { mime: 'image/jpeg', compressed: false, data: fs.readFileSync(path.join(fotosDir, f)).toString('base64') };
  ext.push({ id: 'foto-' + key, uuid });
}
// 4. Mapa: mapa.html entra no pacote como recurso "mapa" (window.__resources.mapa, aberto num iframe).
const mapaPath = path.join(root, 'mapa.html');
const mapa = ext.find(e => e.id === 'mapa');
if (mapa && fs.existsSync(mapaPath)) manifest[mapa.uuid] = { mime: 'text/html', compressed: false, data: fs.readFileSync(mapaPath).toString('base64') };
lines[mIdx] = JSON.stringify(manifest);
lines[eIdx] = JSON.stringify(ext);
const bundle = lines.join('\n');
fs.writeFileSync(bundlePath, bundle, 'utf8');

// 5. Gerar o módulo que o App.js do Expo importa.
const js = '// Gerado automaticamente por build.js a partir de app.html. Não edites à mão.\n' +
  'export default ' + JSON.stringify(bundle) + ';';
fs.writeFileSync(jsPath, js, 'utf8');
if (fs.existsSync(path.dirname(expoJsPath))) fs.writeFileSync(expoJsPath, js, 'utf8');

// 5. index.html para o site (GitHub Pages): o mesmo pacote, com título, descrição, ícone e
//    a imagem de partilha (WhatsApp, Facebook). SITE_URL é o endereço público do site.
const SITE_URL = 'https://adonninho.github.io/bumba/';
const desc = 'Biscatos, trabalho fixo e carreira em Angola. Mostra o que sabes fazer, não quem conheces.';
const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='1' y='1' width='30' height='30' rx='7' fill='%23f4b41a' stroke='%231c1a17' stroke-width='2'/%3E%3Cpath d='M2 2L16 16L2 30ZM30 2L16 16L30 30Z' fill='%23d9412b'/%3E%3C/svg%3E";
const head = [
  '<title>BUMBA · Sem cunha. Só bumba.</title>',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="description" content="' + desc + '">',
  '<meta name="theme-color" content="#f7f0e3">',
  '<link rel="icon" href="' + icon + '">',
  '<meta property="og:type" content="website">',
  '<meta property="og:title" content="BUMBA · Sem cunha. Só bumba.">',
  '<meta property="og:description" content="' + desc + '">',
  '<meta property="og:url" content="' + SITE_URL + '">',
  '<meta property="og:image" content="' + SITE_URL + 'partilha.png">',
  '<meta name="twitter:card" content="summary_large_image">'
].join('\n  ');
if (!bundle.includes('<title>Bundled Page</title>')) throw new Error('Não encontrei o <title> em bumba.html');
fs.writeFileSync(path.join(root, 'index.html'), bundle.replace('<title>Bundled Page</title>', head), 'utf8');

console.log('OK: app.html (' + app.length + ' chars) + ' + fotos.length + ' fotos -> bumba.html (' + Math.round(bundle.length / 1024) + ' KB), index.html, bumba-html.js' + (fs.existsSync(expoJsPath) ? ', bumba/bumba-html.js' : ''));
