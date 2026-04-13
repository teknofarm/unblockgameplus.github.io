const fs = require('fs');
const path = require('path');
const app = require('../server');
const config = require('../config');

// Helper to ensure directory exists
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// Simple internal request simulator
async function renderPage(url) {
  return new Promise((resolve, reject) => {
    // Mocking response object
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      getHeader(name) { return this.headers[name]; },
      locals: {},
      status(code) { this.statusCode = code; return this; },
      render(view, data) {
        // Use app.render to get the final HTML
        app.render(view, { ...res.locals, ...data }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      },
      send(content) { resolve(content); },
      end(content) { resolve(content); },
      headersSent: false
    };

    // Mocking request object
    const req = {
      method: 'GET',
      url: url,
      path: url.split('?')[0],
      originalUrl: url,
      get(name) { return name.toLowerCase() === 'host' ? 'localhost' : ''; },
      protocol: 'http',
      headers: {},
      query: {},
      params: {}
    };

    // Feed to express app
    app(req, res, (err) => {
      if (err) reject(err);
      else reject(new Error(`No route found for ${url}`));
    });
  });
}

async function runExport() {
  const distDir = path.resolve(__dirname, '../dist');
  console.log(`\n🚀 Starting Multi-Account Static Export...`);
  console.log(`📂 Destination: ${distDir}`);

  if (fs.existsSync(distDir)) {
    console.log(`🗑️  Cleaning old dist folder...`);
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir);

  // 1. Copy Public Assets
  const publicDir = path.resolve(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    console.log(`🎨 Copying assets...`);
    fs.cpSync(publicDir, distDir, { recursive: true });
  }

  // 2. Export Homepage, Sitemap Index, News Sitemap, and RSS
  const globals = [
    { url: '/', file: 'index.html' },
    { url: '/sitemap.xml', file: 'sitemap.xml' },
    { url: '/sitemap-news.xml', file: 'sitemap-news.xml' },
    { url: '/rss.xml', file: 'rss.xml' },
    { url: '/robots.txt', file: 'robots.txt' }
  ];

  console.log(`🌐 Exporting Global Pages (Sitemaps, RSS, Robots)...`);
  for (const item of globals) {
    try {
      const content = await renderPage(item.url);
      const dest = path.join(distDir, item.file);
      ensureDirectoryExistence(dest);
      fs.writeFileSync(dest, content);
    } catch (e) {
      console.warn(`⚠️  Failed to export ${item.url}: ${e.message}`);
    }
  }

  // 3. Export Articles & Category Sitemaps (The Heavy Part)
  console.log(`📝 Scanning for articles in ${config.dataDir}...`);
  const articles = [];
  const folders = new Set(); // To track which category sitemaps we need to export
  
  function walkSync(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkSync(filePath);
      } else {
        const parts = file.split(' ');
        if (parts.length >= 2) {
          const code = parts[0];
          const keyword = parts.slice(1).join(' ');
          const relativeDir = path.relative(path.resolve(config.dataDir), dir);
          const dirParts = relativeDir.split(path.sep);
          const f1 = dirParts[0];
          const f2 = dirParts[1];
          if (f1 && f2) {
            articles.push({ code, f1, f2, keyword });
            folders.add(`${f1}`);
            folders.add(`${f1}___${f2}`);
          }
        }
      }
    }
  }

  try {
    walkSync(path.resolve(config.dataDir));
  } catch (e) {
    console.warn(`⚠️  Warning: Could not scan data directory: ${e.message}`);
  }

  console.log(`📦 Found ${articles.length} articles and ${folders.size} sitemap segments.`);

  // 4. Export Category Sitemaps
  console.log(`🗺️  Exporting Category Sitemaps...`);
  for (const f of folders) {
    const url = `/sitemap/${f}.xml`;
    try {
      const content = await renderPage(url);
      const dest = path.join(distDir, 'sitemap', `${f}.xml`);
      ensureDirectoryExistence(dest);
      fs.writeFileSync(dest, content);
    } catch (e) { /* Skip if not found */ }
  }

  // 5. Export Articles in Optimized Batches
  const limit = articles.length;
  const BATCH_SIZE = 100;
  const startTime = Date.now();
  
  for (let i = 0; i < limit; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\r🔮 Rendering: ${i} / ${limit} (${elapsed}s) ...`);
    
    await Promise.all(batch.map(async (art) => {
      const { buildArticleUrl } = require('../lib/slug-utils');
      const url = buildArticleUrl(art.code, art.keyword, art.f1, art.f2);
      
      try {
        const html = await renderPage(url);
        const relativePath = url.startsWith('/') ? url.substring(1) : url;
        const filePath = path.join(distDir, relativePath);
        
        let finalPath = filePath;
        if (!path.extname(finalPath)) {
          finalPath = path.join(finalPath, 'index.html');
        }

        ensureDirectoryExistence(finalPath);
        fs.writeFileSync(finalPath, html);
      } catch (err) {
        // Skip errors
      }
    }));
  }

  console.log(`\n\n✅ Export Complete!`);
  console.log(`📎 Total articles exported: ${Math.min(limit, articles.length)}`);
  console.log(`💡 To deploy to GitHub Pages, upload the contents of the 'dist' folder.`);
  process.exit(0);
}

runExport().catch(err => {
  console.error(`\n❌ Export Failed:`, err);
  process.exit(1);
});
