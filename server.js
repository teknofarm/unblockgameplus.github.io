/**
 * AGC Engine — Main Server
 * Super lightweight Express + EJS, zero build, live edit
 */

const express = require('express');
const compression = require('compression');
const path = require('path');
const config = require('./config');
const contentReader = require('./lib/content-reader');
const { buildArticleUrl } = require('./lib/slug-utils');
const https = require('https');

// ── Ultra-Light In-Memory Cache for Images (Zero-Disk) ──
const imageRAMCache = new Map();
const imageCacheOrder = [];
function getFromCache(key) {
  if (!imageRAMCache.has(key)) return null;
  // Move to end (most recent)
  const idx = imageCacheOrder.indexOf(key);
  if (idx > -1) imageCacheOrder.splice(idx, 1);
  imageCacheOrder.push(key);
  return imageRAMCache.get(key);
}
function addToCache(key, data) {
  const max = (config.cache && config.cache.imageProxyCacheMax) ? config.cache.imageProxyCacheMax : 100;
  if (imageRAMCache.has(key)) {
    imageRAMCache.set(key, data);
    return;
  }
  if (imageCacheOrder.length >= max) {
    const oldest = imageCacheOrder.shift();
    imageRAMCache.delete(oldest);
  }
  imageRAMCache.set(key, data);
  imageCacheOrder.push(key);
}


// ── Cache Management ────────────────────────────────────
console.log('\n  ♻️  Clearing memory cache...');
contentReader.clearCache();

// ── Error Guard (Diagnose Exit Code 1) ──────────────────
process.on('uncaughtException', (err) => {
  console.error('\n  ❌ CRITICAL ERROR (Uncaught):', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n  ❌ UNHANDLED REJECTION:', reason);
  process.exit(1);
});

const app = express();

// ── Middleware ──────────────────────────────────────────
app.set('trust proxy', true); // Essential for correct domain detection behind Nginx
app.use(compression());
// ── Static Files (Optimized Caching) ────────────────
const staticOptions = {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0');
    }
  }
};
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/master', express.static(path.join(__dirname, 'master'), staticOptions));

// ── EJS Setup ──────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Disable EJS cache in dev for live editing
if (process.env.NODE_ENV !== 'production') {
  app.set('view cache', false);
}

// ── Global template variables ──────────────────────────
app.use((req, res, next) => {
  // Auto-detect domain & protocol from request for "layer domain otomatis"
  const host = req.get('host') || 'localhost';
  // Use config to force HTTPS, or detect behind proxy, or use default protocol
  const protocol = config.forceHttps ? 'https' : (req.get('X-Forwarded-Proto') || req.protocol);
  const baseUrl = `${protocol}://${host}`;

  // Make these available in ALL templates
  res.locals.baseUrl = baseUrl;
  res.locals.host = host;
    // ── Dynamic Site Name Detection ─────
    // 1. Priority: Domain/Host (for multi-domain setups)
    // 2. Fallback: Repository/Folder name (for mass deployment)
    // 3. Last Fallback: Config
    const dirName = path.basename(process.cwd());
    const detectSiteName = host.includes('localhost') || host.match(/^\d+\.\d+\.\d+\.\d+$/) 
      ? (dirName !== 'nodeJS' ? dirName : config.siteName) 
      : host.replace(/^www\./, '').split('.')[0];

    res.locals.siteName = detectSiteName || config.siteName;
  res.locals.basePath = config.basePath || '';
  res.locals.currentUrl = `${baseUrl}${config.basePath}${req.originalUrl}`;
  res.locals.currentPath = req.path;
  res.locals.config = config;
  res.locals.year = new Date().getFullYear();

  // ── PageSpeed & Security Optimization ─────
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  if (req.path === '/' || req.path.includes('/view')) {
    res.setHeader('Link', `<${config.basePath}/css/style.css>; rel=preload; as=style`);
  }

  // Inject current theme variables
  const themeKey = config.activeTheme || 'premium-dark';
  res.locals.activeTheme = config.themes[themeKey] || config.themes['premium-dark'];

  // Inject URL builders and redirect helpers for dynamic shuffling
  res.locals.buildArticleUrl = buildArticleUrl;
  res.locals.getRedirectUrl = require('./lib/slug-utils').getRedirectUrl;

  // ── Bot Detection for PageSpeed Optimization ─────
  const ua = (req.get('User-Agent') || '').toLowerCase();
  res.locals.isSpeedBot = ua.includes('chrome-lighthouse') || ua.includes('pagespeed');

  // Defaults to prevent 'undefined' errors in templates
  res.locals.schema = 'website';
  res.locals.canonicalPath = null;
  res.locals.f1 = '';
  res.locals.f2 = '';

  next();
});

// ── Security & Bot Blocker ──────────────────────────────
const botBlocker = require('./lib/bot-blocker');
app.use(botBlocker);

// ── Routes ─────────────────────────────────────────────
const homeRoute = require('./routes/home');
const articleRoute = require('./routes/article');
const categoryRoute = require('./routes/category');
const searchRoute = require('./routes/search');
const sitemapRoute = require('./routes/sitemap');
const robotsRoute = require('./routes/robots');

app.use('/', robotsRoute); // Handle robots first
app.use('/', homeRoute);
app.use('/', sitemapRoute);
app.use('/', searchRoute);
app.use('/', categoryRoute);  // Handle structured category paths first
app.use('/', articleRoute);   // Catch everything else for articles or search fallback

// ── Image Proxy (Zero-Disk / RAM-Cached) ─────────────────
app.get('/media/:slug.jpg', (req, res) => {
  const slug = req.params.slug || '';
  const query = slug.replace(/[-_]+/g, ' ').trim();
  if (!query) return res.status(404).send('Not Found');

  // 1. Check RAM Cache
  const cached = getFromCache(slug);
  if (cached) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Cache', 'HIT');
    return res.send(cached);
  }

  // 2. Fetch from Bing with Timeout
  const bingUrl = `https://tse1.mm.bing.net/th?q=${encodeURIComponent(query)}&pid=Api&mkt=en-US&adlt=moderate`;
  
  const request = https.get(bingUrl, (bingRes) => {
    if (bingRes.statusCode !== 200) {
      return res.status(404).send('Not Found');
    }

    const chunks = [];
    bingRes.on('data', (chunk) => chunks.push(chunk));
    bingRes.on('end', () => {
      const buffer = Buffer.concat(chunks);
      
      // Store in RAM for next users
      addToCache(slug, buffer);

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Cache', 'MISS');
      res.send(buffer);
    });
  });

  request.on('error', (e) => {
    console.error('[Image Proxy]', e.message);
    res.status(500).send('Error');
  });

  // Set timeout to 5s to prevent hanging
  request.setTimeout(5000, () => {
    request.destroy();
    if (!res.headersSent) res.status(504).send('Timeout');
  });
});

// ── 404 Fallback to Search ──────────────────────────
// This catches anything that didn't match a route above
app.use(async (req, res, next) => {
  try {
    const p = req.path.toLowerCase();
    
    // Ignore system files, static extensions, and .well-known paths
    if (
      p.includes('/.well-known/') || 
      p.endsWith('favicon.ico') || 
      p.endsWith('robots.txt') || 
      p.match(/\.(css|js|jpg|jpeg|png|gif|svg|webp|ico|json|map)$/)
    ) {
      return res.status(404).send('Not Found');
    }

    const index = require('./lib/keyword-index');
    
    // 1. Extract keyword from URL path
    let k = req.path
      .replace(/^\/+|\/+$/g, '')         // Strip leading/trailing slashes
      .replace(/\.(html|php|asp|jsp)$/g, '') // Strip common extensions
      .replace(/[-_]+/g, ' ')            // Replace hyphens/underscores with space
      .trim();
    
    // If it's a nested path like 'doc/Oz6/641/something', take the last part
    const parts = k.split('/');
    let query = parts[parts.length - 1] || 'latest articles';
    
    // Clean potential 6-char code if it's at the start of the last segment
    // (e.g. "FzdycG 8 euros" -> "8 euros")
    query = query.replace(/^[a-zA-Z0-9]{6}\s+/, '').trim();
    
    // 2. Perform internal search
    const result = await index.searchKeywords(query, 1, 30);
    
    // 3. Render Search Page instead of 404
    console.log(`[404 Fallback] Mapping "${req.url}" to search: "${query}"`);
    res.status(200).render('pages/search', {
      title: `Search: ${query}`,
      description: `Find information about ${query}`,
      query: query,
      results: result.items,
      total: result.total,
      pagination: { 
        page: 1, 
        totalPages: result.totalPages, 
        total: result.total, 
        query: query 
      },
      schema: 'search'
    });
  } catch (err) {
    next(err);
  }
});

// ── Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).render('pages/404', {
    title: 'Server Error',
    description: 'Something went wrong. Please try again later.',
    schema: 'search'
  });
});

// ── Start (Only if run directly) ───────────────────────
if (require.main === module) {
  const PORT = config.port;
  const server = app.listen(PORT, () => {
    console.log(`\n  ⚡ AGC Engine running on http://localhost:${PORT}`);
    console.log(`  📁 Data: ${path.resolve(config.dataDir)}`);
    console.log(`  📝 Edit templates in /views — no restart needed\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  ❌ ERROR: Port ${PORT} is already in use.`);
    } else {
      console.error('\n  ❌ SERVER ERROR:', err.message);
    }
    process.exit(1);
  });
}

// Export for Vercel / Export script
module.exports = app;
