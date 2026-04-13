const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Cache Configuration ──────────────────────────
const CACHE_DIR = path.resolve(__dirname, '../cache/generated');
const CACHE_ENABLED = true;
const FETCH_TIMEOUT = 5000; // 5 seconds timeout

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * MD5 Helper for cache filenames
 */
function getCacheKey(query) {
  return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

/**
 * Fetch search snippets from DuckDuckGo (Lite version)
 * Refined for maximum relevance and English-only content.
 */
async function fetchBingSnippets(query) {
  if (!query) return [];

  const cacheKey = getCacheKey(query);
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);

  // 1. Try Cache First
  if (CACHE_ENABLED && fs.existsSync(cachePath)) {
    try {
      const cachedData = fs.readFileSync(cachePath, 'utf8');
      const parsed = JSON.parse(cachedData);
      const age = Date.now() - parsed.timestamp;
      
      // Cache valid for 24 hours
      if (age < 24 * 60 * 60 * 1000) {
        console.log(`[SearchFetcher] Cache Hit: "${query}"`);
        return parsed.results;
      }
    } catch (e) {
      console.warn(`[SearchFetcher] Cache read error for "${query}":`, e.message);
    }
  }

  console.log(`[SearchFetcher] Fetching web snippets for: "${query}"...`);
  
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();
    
    const results = [];
    const itemRegex = /<div class="result[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
    const titleRegex = /<a class="result__a"[^>]*>([\s\S]*?)<\/a>/;
    const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/;
    const linkRegex = /href="([^"]+)"/;

    let match;
    while ((match = itemRegex.exec(html)) !== null && results.length < 8) {
      const block = match[1];
      const titleMatch = block.match(titleRegex);
      const snippetMatch = block.match(snippetRegex);
      const linkMatch = block.match(linkRegex);

      if (titleMatch && snippetMatch) {
        const titleText = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const snippetText = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
        
        // Final relevance & language check
        if (snippetText.length > 30 && !/[\u4e00-\u9fa5]/.test(snippetText)) {
          results.push({
            title: titleText,
            snippet: snippetText,
            url: linkMatch ? linkMatch[1] : '#'
          });
        }
      }
    }

    // Handle poor results (too many Chinese characters or too thin)
    if (results.length < 3) {
      console.warn(`[SearchFetcher] Poor results extracted for "${query}". Returning empty array.`);
      return [];
    }

    // 2. Store in Cache if valid
    if (CACHE_ENABLED) {
      try {
        fs.writeFileSync(cachePath, JSON.stringify({
          timestamp: Date.now(),
          query: query,
          results: results
        }), 'utf8');
      } catch (e) {
        console.error(`[SearchFetcher] Cache write error:`, e.message);
      }
    }

    return results;

  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`[SearchFetcher] Timeout fetching results for "${query}"`);
    } else {
      console.error(`[SearchFetcher] Error fetching for "${query}":`, err.message);
    }
    return [];
  }
}

module.exports = { fetchBingSnippets };
