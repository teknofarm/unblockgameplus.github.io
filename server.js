/**
 * AGC Engine — Main Server
 * Super lightweight Express + EJS, zero build, live edit
 */

const express = require('express');
const compression = require('compression');
const path = require('path');
const config = require('./config');
const contentReader = require('./lib/content-reader');

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
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

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
  res.locals.siteName = host.replace(/^www\./, '').split('.')[0] || config.siteName;
  res.locals.currentUrl = `${baseUrl}${req.originalUrl}`;
  res.locals.currentPath = req.path;
  res.locals.config = config;
  res.locals.year = new Date().getFullYear();

  // Inject current theme variables
  const themeKey = config.activeTheme || 'premium-dark';
  res.locals.activeTheme = config.themes[themeKey] || config.themes['premium-dark'];

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

// ── 404 Handler ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: 'Page Not Found',
    description: 'The page you are looking for does not exist.',
    schema: 'search'
  });
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

// ── Start ──────────────────────────────────────────────
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
