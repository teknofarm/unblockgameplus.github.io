/**
 * Article Route
 * URL: /{f1}/{f2}/{slug-with-embedded-code}
 * Direct file lookup via code extraction from slug
 */
const express = require('express');
const router = express.Router();
const { readArticle, htmlToText, formatContent, isLowQuality } = require('../lib/content-reader');
const { extractCodeFromSlug, buildArticleUrl, decodeFolderSlug, extractKeywordFromSlug } = require('../lib/slug-utils');
const { injectAds } = require('../lib/ad-injector');
const index = require('../lib/keyword-index');
const { fetchBingSnippets } = require('../lib/search-fetcher');
const config = require('../config');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Helper to inject human-like contextual anchor text internal links
 */
function injectInternalLinks(content, links) {
  if (!links || links.length === 0) return content;

  // Shuffle links
  for (let i = links.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [links[i], links[j]] = [links[j], links[i]];
  }

  const fallbacks = [
    " As a related aside, you might also find insights on ",
    " This concept is also deeply connected to ",
    " For a deeper dive into similar topics, exploring ",
    " Additionally, paying attention to ",
    " It's also worth noting how this relates to ",
    " Some experts also draw comparisons with "
  ];

  let modifiedContent = content;

  // Process each link sequentially
  for (let link of links) {
    const keyword = link.keyword;
    const url = link.url;

    // Look for word boundary keyword inside plain text
    const regex = new RegExp(`(^|\\s|>)(${escapeRegExp(keyword)})(?=\\s|[.!?,<]|$)`, 'i');

    // Split by </p> to operate strictly inside paragraph blocks 
    const parts = modifiedContent.split('</p>');
    let injected = false;

    for (let i = 0; i < parts.length; i++) {
      // Only process if the piece doesn't already contain a link (distributes 1 link per paragraph safely)
      if (!parts[i].includes('<a ') && !injected) {
        if (regex.test(parts[i])) {
          parts[i] = parts[i].replace(regex, `$1<a href="${url}" style="color: var(--accent); font-weight: 600; text-decoration: underline;" title="${keyword}">$2</a>`);
          injected = true;
        }
      }
    }

    // If we could not inject naturally, use human fallback sentence
    if (!injected && parts.length > 2) {
      // Find a random paragraph to inject fallback (avoiding the very first one to keep intro clean)
      let targetIdx = Math.floor(Math.random() * (parts.length - 2)) + 1;
      let pfx = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      parts[targetIdx] = parts[targetIdx] + `<span class="ctx-link"> ${pfx} <a href="${url}" style="color: var(--accent); font-weight: 600; text-decoration: underline;" title="${keyword}">${keyword}</a>.</span>`;
    }

    modifiedContent = parts.join('</p>');
  }

  return modifiedContent;
}

// ── 1-Segment Fallback (e.g., /halllo or /random-query) ────────
router.get('/:folderSlug', async (req, res, next) => {
  const { folderSlug } = req.params;

  // Skip reserved and dots
  const reserved = ['search', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'css', 'js', 'images', 'master', 'sitemap', 'sitemap-news', 'rss', 'page'];
  if (reserved.includes(folderSlug) || folderSlug.includes('.')) return next();

  // If it's a known folder-slug or unknown, treat as search query
  const q = extractKeywordFromSlug(folderSlug);
  const result = await index.searchKeywords(q, 1, 30);

  return res.render('pages/search', {
    title: `Search: ${q}`,
    description: `Exploring topics for ${q}`,
    query: q,
    results: result.items,
    total: result.total,
    pagination: { page: 1, totalPages: result.totalPages, total: result.total, query: q },
    schema: 'search'
  });
});

// ── Model A: 4-segment /{prefix}/{f1}/{f2}/{slug}  (also handles old random-word URLs) ──
router.get('/:p1/:p2/:p3/:slug', async (req, res, next) => {
  try {
    const { p1, p2, p3, slug } = req.params;
    const code = extractCodeFromSlug(slug);
    if (!code) return next();

    // For Model A: p1 = fixed prefix, p2 = f1, p3 = f2  (check this first)
    // Also try other combos for backward-compat with old style random-word URLs
    const combinations = [
      { f1: p2, f2: p3 }, // Model A: prefix/f1/f2/slug  ← PRIMARY
      { f1: p3, f2: p2 }, // Model A swapped
      { f1: p1, f2: p2 },
      { f1: p2, f2: p1 },
      { f1: p1, f2: p3 },
      { f1: p3, f2: p1 }
    ];

    let foundF1 = null, foundF2 = null, targetFile = null, keyword = '';

    for (const combo of combinations) {
      const entries = await index.getFolderRaw(combo.f1, combo.f2);
      const match = entries.find(e => e.code.toLowerCase() === code.toLowerCase());
      
      if (match) {
        foundF1 = match.f1; foundF2 = match.f2;
        targetFile = `${match.code} ${match.keyword}`;
        keyword = match.keyword;
        break;
      }
      
      // Secondary direct-file fallback (minimal)
      const folderPath = path.resolve(config.dataDir, combo.f1, combo.f2);
      if (fs.existsSync(folderPath)) {
        try {
          const files = fs.readdirSync(folderPath);
          for (const file of files) {
            if (file.toLowerCase().startsWith(code.toLowerCase() + ' ')) {
              foundF1 = combo.f1; foundF2 = combo.f2;
              targetFile = file;
              keyword = file.substring(code.length + 1);
              break;
            }
          }
        } catch(e) {}
      }
      if (targetFile) break;
    }

    if (!targetFile) {
      const q = extractKeywordFromSlug(slug);
      const result = await index.searchKeywords(q, 1, 30);
      return res.render('pages/search', {
        title: `Search: ${q}`, description: `Results for ${q}`,
        query: q, results: result.items, total: result.total,
        pagination: { page: 1, totalPages: result.totalPages, total: result.total, query: q },
        schema: 'search'
      });
    }

    return renderArticle(res, code, foundF1, foundF2, keyword, next);
  } catch (err) {
    console.error('[Article 4-Segment Error]', err.message);
    next();
  }
});

// ── Model B: 3-segment /{f1}/{f2}/{slug} ───────────────────────────────
router.get('/:f1/:f2/:slug', async (req, res, next) => {
  try {
    const { f1, f2, slug } = req.params;

    // Skip reserved first-segment names
    const reserved = ['page', 'search', 'sitemap', 'sitemap-news', 'rss', 'master', 'css', 'js', 'images'];
    if (reserved.includes(f1)) return next();

    const code = extractCodeFromSlug(slug);
    if (!code) return next();

    // Try both folder combinations for Model 'c' resiliency
    const combinations = [
      { f1: f1, f2: f2 },
      { f1: f2, f2: f1 }
    ];

    let targetFile = null, keyword = '', foundF1 = f1, foundF2 = f2;
    
    for (const combo of combinations) {
      const entries = await index.getFolderRaw(combo.f1, combo.f2);
      const match = entries.find(e => e.code.toLowerCase() === code.toLowerCase());
      
      if (match) {
        foundF1 = combo.f1; foundF2 = combo.f2;
        targetFile = `${match.code} ${match.keyword}`;
        keyword = match.keyword;
        break;
      } else {
        // Direct folder lookup fallback
        const folderPath = path.resolve(config.dataDir, combo.f1, combo.f2);
        if (fs.existsSync(folderPath)) {
          try {
            const files = fs.readdirSync(folderPath);
            for (const file of files) {
              if (file.toLowerCase().startsWith(code.toLowerCase() + ' ')) {
                foundF1 = combo.f1; foundF2 = combo.f2;
                targetFile = file;
                keyword = file.substring(code.length + 1);
                break;
              }
            }
          } catch(e) {}
        }
      }
      if (targetFile) break;
    }

    if (!targetFile) {
      const q = extractKeywordFromSlug(slug);
      const result = await index.searchKeywords(q, 1, 30);
      return res.render('pages/search', {
        title: `Search: ${q}`, description: `Results for ${q}`,
        query: q, results: result.items, total: result.total,
        pagination: { page: 1, totalPages: result.totalPages, total: result.total, query: q },
        schema: 'search'
      });
    }

    return renderArticle(res, code, foundF1, foundF2, keyword, next);
  } catch (err) {
    console.error('[Article 3-Segment Error]', err.message);
    next();
  }
});


// ── 2nd Segment Full Article / Fallback ───────────
router.get('/:folderSlug/:slug', async (req, res, next) => {
  try {
    const { folderSlug, slug } = req.params;
    const code = extractCodeFromSlug(slug);
    if (!code) return next();

    // Decode folderSlug into f1 and f2 (handles older prefix-f-f1-f2 format)
    const decoded = decodeFolderSlug(folderSlug);
    let f1, f2, targetFile = null, keyword = '';

    if (decoded) {
      f1 = decoded.f1; f2 = decoded.f2;
      const folderPath = path.resolve(config.dataDir, f1, f2);
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
          if (file.toLowerCase().startsWith(code.toLowerCase() + ' ')) {
            targetFile = file;
            keyword = file.substring(code.length + 1);
            break;
          }
        }
      }
    }

    // If direct lookup fails, try smart search by code across index (slower but resilient)
    if (!targetFile) {
      const q = extractKeywordFromSlug(slug);
      const result = await index.searchKeywords(q, 1, 30);
      return res.render('pages/search', {
        title: `Search: ${q}`,
        description: `Searching for ${q}...`,
        query: q,
        results: result.items,
        total: result.total,
        pagination: { page: 1, totalPages: result.totalPages, total: result.total, query: q },
        schema: 'search'
      });
    }

    return renderArticle(res, code, f1, f2, keyword, next);
  } catch (err) {
    console.error('[Article 2-Segment Error]', err.message);
    next();
  }
});

/**
 * Reusable Article Rendering Logic
 */
async function renderArticle(res, code, f1, f2, keyword, next) {
  try {
    const article = await readArticle(code, f1, f2, keyword);
    
    // Check for "empty" or low-quality articles
    if (!article || isLowQuality(article)) {
      // Fallback: Generate article logic
      const q = keyword || extractKeywordFromSlug(slug) || "Information";
      
      // 1. Fetch web snippets (Bing)
      const webResults = await fetchBingSnippets(q);
      
      // 2. Fetch internal related keyword search
      const internalSearch = await index.searchKeywords(q, 1, 8);
      const internalResults = internalSearch.items;

      return res.render('pages/generated-article', {
        title: q,
        description: `Everything you need to know about ${q}`,
        f1: f1 || '',
        f2: f2 || '',
        webResults: webResults,
        internalResults: internalResults,
        schema: 'article',
        config: config
      });
    }

    const fullContent = (article.description || '') + '\n\n' + (article.description_alt || '');
    const formattedContent = formatContent(fullContent);

    let related = [];
    if (article.related_keywords && article.related_keywords.length > 0) {
      related = await index.findRelated(article.related_keywords, code, 8);
    }

    const canonicalPath = buildArticleUrl(f1, f2, code, keyword);

    const { getRedirectUrl } = require('../lib/slug-utils');

    // Build automated SEO Internal Links
    const linksToInject = [];
    
    let selfUrl = getRedirectUrl(canonicalPath, article.title);
    linksToInject.push({ url: selfUrl, keyword: article.title }); // 1 self keyword
    
    for (let i = 0; i < Math.min(3, related.length); i++) {
      let rKw = related[i].matchedKeyword || related[i].keyword;
      let rUrl = buildArticleUrl(related[i].f1, related[i].f2, related[i].code, related[i].keyword);
      rUrl = getRedirectUrl(rUrl, rKw);
      
      linksToInject.push({ url: rUrl, keyword: rKw }); // up to 3 diff keywords
    }

    const internallyLinkedContent = injectInternalLinks(formattedContent, linksToInject);
    const contentWithAds = injectAds(internallyLinkedContent);

    const metaDesc = htmlToText(article.description, 155) ||
      htmlToText(article.description_alt, 155) ||
      article.title;

    const imageQuery = encodeURIComponent(article.title);

    res.render('pages/article', {
      title: article.title,
      description: metaDesc,
      article,
      contentWithAds,
      related,
      f1,
      f2,
      code,
      keyword,
      canonicalPath,
      imageQuery,
      schema: 'article'
    });
  } catch (e) {
    next();
  }
}

module.exports = router;
