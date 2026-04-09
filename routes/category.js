/**
 * Category Routes
 * /{f1}       — List subfolders in a Level 1 folder
 * /{f1}/{f2}  — List articles in a subfolder (with pagination)
 * Also handles: /{f1}/{f2}?page=2
 */
const express = require('express');
const router = express.Router();
const index = require('../lib/keyword-index');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// Level 1: /page/{f1} — list subfolders
router.get('/page/:f1', async (req, res, next) => {
  const { f1 } = req.params;

  // Skip reserved paths or article folder-slugs (containing "-f-")
  const reserved = ['search', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'css', 'js', 'images', 'master', 'sitemap', 'sitemap-news', 'rss'];
  if (reserved.includes(f1) || f1.includes('.') || f1.includes('-f-')) return next();

  // Verify folder exists
  const folderPath = path.resolve(config.dataDir, f1);
  if (!fs.existsSync(folderPath)) return next();

  try {
    const subfolders = await index.getSubfolders(f1);
    if (subfolders.length === 0) return next();

    const totalArticles = subfolders.reduce((sum, s) => sum + s.count, 0);

    res.render('pages/category', {
      title: `Category ${f1} — Browse ${totalArticles.toLocaleString()} Articles`,
      description: `Explore ${totalArticles.toLocaleString()} articles in category ${f1}. Browse through ${subfolders.length} subcategories.`,
      f1,
      f2: null,
      subfolders,
      articles: null,
      totalArticles,
      pagination: null,
      schema: 'category'
    });
  } catch (err) {
    console.error('[Category L1]', err.message);
    next();
  }
});

// Level 2: /page/{f1}/{f2} — list articles
router.get('/page/:f1/:f2', async (req, res, next) => {
  const { f1, f2 } = req.params;

  // If f2 contains a dash, it might be an article slug — skip to article handler
  if (f2.includes('-') && f2.length > 10) return next();

  // Verify folder exists in keyw
  const keywPath = path.resolve(config.keywDir, f1, f2);
  // keyw files don't have extensions, so check if it exists as a file
  if (!fs.existsSync(keywPath)) return next();

  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = config.cache.categoryPerPage;
    const result = await index.getFolder(f1, f2, page, perPage);

    if (result.total === 0) return next();

    res.render('pages/category', {
      title: `Category ${f1}/${f2} — Page ${page}`,
      description: `Browse ${result.total.toLocaleString()} articles in category ${f1}/${f2}. Page ${page} of ${result.totalPages}.`,
      f1,
      f2,
      subfolders: null,
      articles: result.items,
      totalArticles: result.total,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        hasPrev: page > 1,
        hasNext: page < result.totalPages,
        prevUrl: `/page/${f1}/${f2}?page=${page - 1}`,
        nextUrl: `/page/${f1}/${f2}?page=${page + 1}`,
      },
      schema: 'category'
    });
  } catch (err) {
    console.error('[Category L2]', err.message);
    next();
  }
});

// ── Legacy Redirects ──────────────────────────────────
// Redirect old /f1 to /page/f1
router.get('/:f1', (req, res, next) => {
  const { f1 } = req.params;
  const reserved = ['search', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'css', 'js', 'images', 'master', 'sitemap', 'sitemap-news', 'rss', 'page'];
  if (reserved.includes(f1) || f1.includes('.') || f1.includes('-f-')) return next();

  const folderPath = path.resolve(config.dataDir, f1);
  if (fs.existsSync(folderPath) && fs.lstatSync(folderPath).isDirectory()) {
    return res.redirect(301, `/page/${f1}`);
  }
  next();
});

// Redirect old /f1/f2 to /page/f1/f2
router.get('/:f1/:f2', (req, res, next) => {
  const { f1, f2 } = req.params;
  if (f1 === 'page') return next(); // Already in new format

  const keywPath = path.resolve(config.keywDir, f1, f2);
  if (fs.existsSync(keywPath)) {
    return res.redirect(301, `/page/${f1}/${f2}`);
  }
  next();
});

module.exports = router;
