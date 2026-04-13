/**
 * Search Route
 * /search?q=keyword&page=1
 */
const express = require('express');
const router = express.Router();
const index = require('../lib/keyword-index');
const config = require('../config');

router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const page = parseInt(req.query.page) || 1;
    const perPage = config.cache.searchPerPage;

    let result = { items: [], total: 0, page: 1, totalPages: 0 };

    if (query) {
      result = await index.searchKeywords(query, page, perPage);
    }

    res.render('pages/search', {
      title: query ? `Search: "${query}" — ${result.total} results` : 'Search Articles',
      description: query
        ? `Found ${result.total} results for "${query}". Browse articles and guides.`
        : 'Search through our comprehensive database of articles and guides.',
      query,
      results: result.items,
      total: result.total,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        hasPrev: page > 1,
        hasNext: page < result.totalPages,
        prevUrl: `/search?q=${encodeURIComponent(query)}&page=${page - 1}`,
        nextUrl: `/search?q=${encodeURIComponent(query)}&page=${page + 1}`,
      },
      schema: 'search'
    });
  } catch (err) {
    console.error('[Search]', err.message);
    res.status(500).render('pages/404', {
      title: 'Search Error',
      description: 'Unable to process search.'
    });
  }
});

module.exports = router;
