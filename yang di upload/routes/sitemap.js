/**
 * Sitemap Routes (Original Folder-Based Structure)
 * /sitemap.xml              — Sitemap index
 * /sitemap/:f1/:f2.xml      — Per-folder sitemap  
 * /master                   — Human-readable master list of ALL sitemap URLs
 */
const express = require('express');
const router = express.Router();
const index = require('../lib/keyword-index');
const { buildArticleUrl } = require('../lib/slug-utils');

// ── Sitemap Index (Tier 1) ─────────────────
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = res.locals.baseUrl;
    const folders = await index.getLevel1Folders();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
    for (const folder of folders) {
      xml += `  <sitemap>
    <loc>${baseUrl}/sitemap/${folder.f1}.xml</loc>
  </sitemap>
`;
    }
    xml += `</sitemapindex>`;
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[Sitemap Index]', err.message);
    res.status(500).send('Error generating sitemap index');
  }
});

// ── Master Page — Human-readable sitemap URL list ───
router.get('/master', async (req, res) => {
  try {
    const baseUrl = res.locals.baseUrl;
    const allItems = await index.getAllFolders();

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sitemap Master — ${res.locals.host}</title>
<meta name="robots" content="noindex, nofollow">
<style>
:root{--bg:#0b0e14;--card:#161b22;--border:#30363d;--text:#c9d1d9;--primary:#58a6ff;--accent:#238636}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);padding:40px 20px;line-height:1.5;max-width:800px;margin:0 auto}
.header{text-align:center;margin-bottom:40px}
h1{font-size:28px;color:#fff;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:12px}
.info{color:#8b949e;font-size:14px}
.actions{display:flex;justify-content:center;margin-bottom:30px}
.btn-copy-all{background:var(--primary);color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px;transition:opacity 0.2s}
.btn-copy-all:hover{opacity:0.9}
.sitemap-list{display:flex;flex-direction:column;gap:12px}
.sitemap-item{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;transition:border-color 0.2s}
.sitemap-item:hover{border-color:#8b949e}
.item-left{display:flex;align-items:center;gap:20px}
.item-index{background:rgba(88,166,255,0.1);color:var(--primary);font-size:12px;font-weight:bold;padding:4px 8px;border-radius:4px;min-width:30px;text-align:center}
.item-name{font-weight:bold;font-size:18px;color:#f0f6fc}
.item-path{background:#0d1117;color:var(--primary);font-family:monospace;padding:6px 16px;border-radius:6px;font-size:13px;border:1px solid var(--border);text-decoration:none;cursor:pointer;position:relative}
.item-path:hover{border-color:var(--primary)}
.item-path:active{transform:scale(0.98)}
.item-path::after{content:'Copied!';position:absolute;top:-30px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;opacity:0;transition:opacity 0.2s;pointer-events:none}
.item-path.copied::after{opacity:1}
textarea#allUrls{position:absolute;left:-9999px}
</style>
</head>
<body>
<div class="header">
  <h1>📋 Sitemap Master</h1>
  <p class="info">${res.locals.host} — ${allItems.length} sub-sitemaps total</p>
</div>

<div class="actions">
  <button class="btn-copy-all" onclick="copyAll()">📋 Copy All Relative Paths</button>
</div>

<textarea id="allUrls" readonly>`;

    const allRelativePaths = [];
    allRelativePaths.push(`sitemap.xml`);
    allRelativePaths.push(`sitemap-news.xml`);
    allRelativePaths.push(`rss.xml`);
    for (const item of allItems) {
      allRelativePaths.push(`sitemap/${item.f1}___${item.f2}.xml`);
    }
    html += allRelativePaths.join('\n');

    html += `</textarea>

<div class="sitemap-list">
  <div class="sitemap-item">
    <div class="item-left">
      <span class="item-index">#00</span>
      <span class="item-name">Main Index</span>
    </div>
    <div class="item-path" onclick="copyOne(this)">sitemap.xml</div>
  </div>
  <div class="sitemap-item">
    <div class="item-left">
      <span class="item-index">GS</span>
      <span class="item-name">Google News</span>
    </div>
    <div class="item-path" onclick="copyOne(this)">sitemap-news.xml</div>
  </div>
  <div class="sitemap-item">
    <div class="item-left">
      <span class="item-index">RSS</span>
      <span class="item-name">RSS Feed</span>
    </div>
    <div class="item-path" onclick="copyOne(this)">rss.xml</div>
  </div>`;

    const tier1Folders = await index.getLevel1Folders();
    tier1Folders.forEach((folder, i) => {
      const idx = (i + 1).toString().padStart(2, '0');
      html += `
  <div class="sitemap-item">
    <div class="item-left">
      <span class="item-index">#${idx}</span>
      <span class="item-name">${folder.f1.toUpperCase()}</span>
    </div>
    <div class="item-path" onclick="copyOne(this)">sitemap/${folder.f1}.xml</div>
  </div>`;
    });

    html += `
</div>

<script>
function copyOne(el) {
  const text = el.textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 1500);
  });
}
function copyAll(){
  var t=document.getElementById('allUrls');
  t.select();
  document.execCommand('copy');
  alert('Copied ' + t.value.split('\\n').length + ' relative paths!');
}
</script>
</body></html>`;

    res.type('text/html');
    res.send(html);
  } catch (err) {
    console.error('[Master]', err.message);
    res.status(500).send('Error generating master list');
  }
});

// ── Final URLset (Tier 3) ───────────────────
router.get(/^\/sitemap\/([A-Za-z0-9_-]+)___([A-Za-z0-9_-]+)\.xml$/, async (req, res) => {
  try {
    const f1 = req.params[0];
    const f2 = req.params[1];
    const baseUrl = res.locals.baseUrl;
    // Shuffle entries for dynamic randomization every access
    const entries = await index.getFolderRaw(f1, f2);
    const shuffledEntries = index.shuffleArray([...entries]);

    if (!shuffledEntries || shuffledEntries.length === 0) {
      return res.status(404).send('Sitemap folder not found');
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
`;

    for (const entry of shuffledEntries) {
      const artUrl = buildArticleUrl(entry.f1, entry.f2, entry.code, entry.keyword);
      const imgSlug = entry.keyword.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      xml += `  <url>
    <loc>${baseUrl}${artUrl}</loc>
    <image:image>
      <image:loc>${baseUrl}/media/${imgSlug}.jpg</image:loc>
      <image:title>${escapeXml(entry.keyword)}</image:title>
    </image:image>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    xml += `</urlset>`;
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[Sitemap Detail]', err.message);
    res.status(500).send('Error generating sitemap detail');
  }
});

// ── Category Index (Tier 2) ──────────────────
router.get('/sitemap/:f1.xml', async (req, res) => {
  try {
    const { f1 } = req.params;
    const baseUrl = res.locals.baseUrl;
    const subs = await index.getSubfolders(f1);

    if (subs.length === 0) {
      return res.status(404).send('Category not found');
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
    for (const sub of subs) {
      xml += `  <sitemap>
    <loc>${baseUrl}/sitemap/${sub.f1}___${sub.f2}.xml</loc>
  </sitemap>
`;
    }
    xml += `</sitemapindex>`;
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[Sitemap Category Index]', err.message);
    res.status(500).send('Error generating sitemap category index');
  }
});

// ── Google News Sitemap (500 random) ─────────
router.get('/sitemap-news.xml', async (req, res) => {
  try {
    const baseUrl = res.locals.baseUrl;
    const randomArticles = await index.getRandomArticles(500);
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
`;

    for (const entry of randomArticles) {
      xml += `  <url>
    <loc>${baseUrl}${buildArticleUrl(entry.f1, entry.f2, entry.code, entry.keyword)}</loc>
    <news:news>
      <news:publication>
        <news:name>${res.locals.siteName}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${today}</news:publication_date>
      <news:title>${escapeXml(entry.keyword)}</news:title>
    </news:news>
  </url>
`;
    }

    xml += `</urlset>`;
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[Google News Sitemap Error]', err.message);
    res.status(500).send('Error generating Google News sitemap');
  }
});

// ── RSS Feed (500 random articles) ────────────
router.get('/rss.xml', async (req, res) => {
  try {
    const baseUrl = res.locals.baseUrl;
    const randomArticles = await index.getRandomArticles(500);
    const today = new Date().toUTCString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${res.locals.siteName}</title>
    <link>${baseUrl}</link>
    <description>Latest insights and articles from ${res.locals.host}</description>
    <language>en</language>
    <pubDate>${today}</pubDate>
    <lastBuildDate>${today}</lastBuildDate>
`;

    for (const entry of randomArticles) {
      const artUrl = buildArticleUrl(entry.f1, entry.f2, entry.code, entry.keyword);
      xml += `    <item>
      <title>${escapeXml(entry.keyword)}</title>
      <link>${baseUrl}${artUrl}</link>
      <guid>${baseUrl}${artUrl}</guid>
      <pubDate>${today}</pubDate>
      <description><![CDATA[ Read more about ${entry.keyword} on ${res.locals.host}. ]]></description>
    </item>
`;
    }

    xml += `  </channel>
</rss>`;
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[RSS Feed Error]', err.message);
    res.status(500).send('Error generating RSS feed');
  }
});

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

module.exports = router;
