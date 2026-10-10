/**
 * Genera una pagina HTML statica per ogni evento elencato in data/eventi-archivio.json,
 * con meta tag Open Graph/Twitter corretti per le anteprime su WhatsApp, Facebook, ecc.
 *
 * Eseguito automaticamente da Netlify ad ogni deploy (vedi netlify.toml).
 * Nessuna dipendenza esterna: usa solo i moduli nativi di Node.
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://ctsmsanmarino.netlify.app';
const SITE_NAME = 'Comunità e Territorio San Marino';
const DEFAULT_OG_IMAGE = SITE_URL + '/og-image.jpg';
const DEFAULT_DESCRIPTION = 'Evento organizzato da Comunità e Territorio San Marino.';

const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'eventi-archivio.json');
const OUTPUT_DIR = path.join(ROOT, 'eventi');
const MARKER_FILE = '.generated-by-build';

// --- Utility -----------------------------------------------------------

function slugify(title, date) {
  let base = (title || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // rimuove accenti
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base.length > 50) {
    base = base.slice(0, 50);
    const lastDash = base.lastIndexOf('-');
    if (lastDash > 20) base = base.slice(0, lastDash); // evita di tagliare a meta' parola
  }
  return base || 'evento-' + Buffer.from(date || '').toString('hex').slice(0, 8);
}

function escapeHtml(str) {
  return (str || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1).trim() + '…' : str;
}

// --- Template ------------------------------------------------------------

function renderPage(item, slug) {
  const title = escapeHtml(item.title);
  const date = escapeHtml(item.date);
  const plainDesc = (item.description || '').replace(/\s+/g, ' ').trim();
  const description = escapeHtml(truncate(plainDesc || DEFAULT_DESCRIPTION, 200));
  const pageUrl = SITE_URL + '/eventi/' + slug + '/';
  const images = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
  const ogImage = images.length ? (SITE_URL + encodeURI(images[0])) : DEFAULT_OG_IMAGE;
  const pdfUrl = item.pdf ? escapeHtml(encodeURI(item.pdf)) : '';
  const galleryHtml = images.length
    ? '<div class="gallery">' + images.map((src) => '<a href="' + escapeHtml(encodeURI(src)) + '" target="_blank" rel="noopener"><img src="' + escapeHtml(encodeURI(src)) + '" alt="' + title + '" loading="lazy"></a>').join('') + '</div>'
    : '';
  const descHtml = item.description
    ? '<div class="excerpt">' + escapeHtml(item.description).replace(/\n/g, '<br>') + '</div>'
    : '';
  const pdfBox = pdfUrl
    ? `<div class="pdf-box">
    <span>Documento dell\'evento in formato PDF</span>
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <a class="btn-gold" href="${pdfUrl}" target="_blank" rel="noopener">Scarica il PDF →</a>
      <button class="btn-share" onclick="condividiLink(this)" type="button">🔗 Condividi</button>
    </div>
  </div>`
    : `<div style="display:flex; gap:10px; flex-wrap:wrap;"><button class="btn-share" onclick="condividiLink(this)" type="button">🔗 Condividi</button></div>`;

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — ${SITE_NAME}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${pageUrl}">

<!-- Favicon -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0f2044">

<!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
<meta property="og:type" content="article">
<meta property="og:url" content="${pageUrl}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="it_IT">

<!-- Twitter / X Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${ogImage}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --navy: #0f2044; --navy-light: #1a3166; --navy-deep: #091529;
    --gold: #c9a84c; --gold-light: #e0c47a; --gold-pale: #f5e9c8;
    --cream: #faf7f0; --white: #ffffff; --text: #1a1a2e; --text-muted: #5a6070;
    --border: rgba(201,168,76,0.25);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Jost', sans-serif; background: var(--cream); color: var(--text); line-height: 1.6; }
  header {
    background: var(--navy); padding: 22px 5vw; display: flex; align-items: center; gap: 14px;
    border-bottom: 3px solid var(--gold);
  }
  header a { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--white); }
  .emblem {
    width: 38px; height: 38px; border-radius: 50%;
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cormorant Garamond', serif; font-weight: 700; color: var(--navy); font-size: 16px;
  }
  header .site-name { font-family: 'Cormorant Garamond', serif; font-size: 17px; letter-spacing: .04em; }
  main { max-width: 760px; margin: 0 auto; padding: 60px 24px 80px; }
  .eyebrow { font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: var(--gold); margin-bottom: 14px; }
  h1 {
    font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: clamp(28px, 4vw, 42px);
    color: var(--navy); line-height: 1.2; margin-bottom: 16px;
  }
  .date { font-size: 13px; color: var(--text-muted); margin-bottom: 32px; }
  .excerpt { font-size: 17px; color: var(--text); margin-bottom: 36px; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; margin-bottom: 36px; }
  .gallery img { width: 100%; height: 150px; object-fit: cover; border-radius: 2px; display: block; }
  .pdf-box {
    border: 1px solid var(--border); border-radius: 4px; padding: 24px; background: var(--white);
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  }
  .pdf-box span { font-size: 14px; color: var(--text-muted); }
  .btn-gold {
    display: inline-block; background: var(--gold); color: var(--navy); text-decoration: none;
    font-weight: 600; font-size: 13px; letter-spacing: .04em; padding: 12px 24px; border-radius: 2px;
    transition: background .2s;
  }
  .btn-gold:hover { background: var(--gold-light); }
  .btn-share {
    display: inline-flex; align-items: center; gap: 6px;
    background: transparent; color: var(--navy); border: 1px solid var(--gold);
    font-weight: 600; font-size: 13px; letter-spacing: .04em; padding: 12px 20px; border-radius: 2px;
    cursor: pointer; font-family: 'Jost', sans-serif; transition: background .2s, color .2s;
  }
  .btn-share:hover { background: var(--gold); color: var(--white); }
  .back-link { display: inline-block; margin-top: 48px; font-size: 13px; color: var(--navy); text-decoration: none; border-bottom: 1px solid var(--border); }
  footer { text-align: center; padding: 32px; font-size: 12px; color: var(--text-muted); }
</style>
</head>
<body>
<header>
  <a href="/">
    <span class="emblem">CT</span>
    <span class="site-name">${SITE_NAME}</span>
  </a>
</header>
<main>
  <div class="eyebrow">Evento</div>
  <h1>${title}</h1>
  <div class="date">${date}</div>
  ${descHtml}
  ${galleryHtml}
  ${pdfBox}
  <a class="back-link" href="/">← Torna al sito di CTSM</a>
</main>
<footer>Comunità e Territorio San Marino · Associazione Culturale</footer>
<script src="/share.js"></script>
<script>
  function condividiLink(btn) {
    ctsmShare(window.location.href, document.title.split(' — ')[0]);
  }
</script>
</body>
</html>
`;
}

// --- Main ------------------------------------------------------------

// Slug univoci, in ordine di elenco nel json (stessa logica replicata in index.html)
function uniqueSlugs(items) {
  const used = new Set();
  return items.map((item) => {
    const base = slugify(item.title, item.date);
    let unique = base, i = 2;
    while (used.has(unique)) { unique = base + '-' + i; i++; }
    used.add(unique);
    return unique;
  });
}

function main() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.warn('[generate-eventi] data/eventi-archivio.json non trovato o non valido, nessuna pagina generata.');
    return;
  }

  const items = data.items || [];

  // Pulizia: rimuove le cartelle generate in precedenza che non esistono piu' nel json
  if (fs.existsSync(OUTPUT_DIR)) {
    const existingSlugs = new Set(uniqueSlugs(items));
    for (const entry of fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
      if (entry.isDirectory() && !existingSlugs.has(entry.name)) {
        const markerPath = path.join(OUTPUT_DIR, entry.name, MARKER_FILE);
        if (fs.existsSync(markerPath)) {
          fs.rmSync(path.join(OUTPUT_DIR, entry.name), { recursive: true, force: true });
          console.log('[generate-eventi] rimossa pagina obsoleta:', entry.name);
        }
      }
    }
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const slugs = uniqueSlugs(items);
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const slug = slugs[idx];

    const pageDir = path.join(OUTPUT_DIR, slug);
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, 'index.html'), renderPage(item, slug));
    fs.writeFileSync(path.join(pageDir, MARKER_FILE), '');
    console.log('[generate-eventi] generata pagina:', '/eventi/' + slug + '/');
  }

  console.log(`[generate-eventi] completato: ${items.length} pagine generate.`);
}

main();
