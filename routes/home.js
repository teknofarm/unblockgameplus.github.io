/**
 * Home Page Route
 */
const express = require('express');
const router = express.Router();
const index = require('../lib/keyword-index');
const config = require('../config');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = config.cache.homepageArticles || 30;

    // Use random articles for a dynamic homepage
    const articles = await index.getRandomArticles(perPage);
    const result = { items: articles, total: await index.getTotalCount(), page, totalPages: Math.ceil((await index.getTotalCount()) / perPage) };
    const folders = await index.getLevel1Folders();
    
    // Add pagination metadata
    const pagination = {
      page: result.page,
      totalPages: result.totalPages,
      total: result.total,
      hasPrev: result.page > 1,
      hasNext: result.page < result.totalPages,
      prevUrl: `/?page=${result.page - 1}`,
      nextUrl: `/?page=${result.page + 1}`
    };

    const hv = config.homepageVersion || 'v1';
    res.render(`pages/home-${hv}`, {
      title: page > 1 ? `${res.locals.siteName} — Page ${page}` : `${res.locals.siteName} — Explore Knowledge`,
      description: `Discover ${result.total.toLocaleString()} comprehensive articles, guides, and answers across multiple topics.`,
      articles: result.items,
      folders,
      totalCount: result.total,
      pagination,
      schema: 'website',
      canonicalPath: page > 1 ? `/?page=${page}` : '/'
    });
  } catch (err) {
    console.error('[Home]', err.message);
    res.status(500).render('pages/404', {
      title: 'Error', description: 'Unable to load homepage.', schema: 'search'
    });
  }
});

module.exports = router;
