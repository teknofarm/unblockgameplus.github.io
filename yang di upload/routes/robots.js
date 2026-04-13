/**
 * Dynamic Robots.txt Route
 * Generates sitemap URLs based on the current requested domain
 * and blocks aggressive scrapers / SEO bots.
 */
const express = require('express');
const router = express.Router();
const config = require('../config');

router.get('/robots.txt', (req, res) => {
  const baseUrl = res.locals.baseUrl;
  const blockedBots = config.security.blockedBots;

  const lines = [];

  // 1. General Rules for Search Engines
  lines.push('User-agent: *');
  lines.push('Allow: /');
  lines.push('Allow: /search');
  lines.push('Allow: /search/*');
  lines.push('Allow: /sitemap.xml');
  lines.push('Allow: /sitemap-news.xml');
  lines.push('');

  // 2. Explicit Blocks for SEO Scrapers & Aggressive Bots
  lines.push('# Block Aggressive Scrapers & SEO Tools');
  blockedBots.forEach(bot => {
    // Standardize naming: uppercase first letter for robots.txt readability
    const botName = bot.charAt(0).toUpperCase() + bot.slice(1);
    lines.push(`User-agent: ${botName}`);
  });
  lines.push('Disallow: /');
  lines.push('');

  // 3. Dynamic Sitemaps
  lines.push(`# Dynamic Sitemaps for ${res.locals.host}`);
  lines.push(`Sitemap: ${baseUrl}/sitemap.xml`);
  lines.push(`Sitemap: ${baseUrl}/sitemap-news.xml`);
  lines.push(`Sitemap: ${baseUrl}/rss.xml`);

  res.type('text/plain');
  res.send(lines.join('\n'));
});

module.exports = router;
