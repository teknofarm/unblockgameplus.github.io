/**
 * Content Reader
 * Reads and parses JSON content files (without extension)
 * Includes LRU cache for recently accessed articles
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

// Simple LRU Cache
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    // Refresh position
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clear() {
    this.cache.clear();
  }
}

const contentCache = new LRUCache(config.cache.contentCacheMax || 500);

/**
 * Clear the in-memory content cache
 */
function clearCache() {
  contentCache.clear();
}

/**
 * Read and parse an article JSON file
 * @param {string} code - The unique code prefix
 * @param {string} f1 - Level 1 folder name
 * @param {string} f2 - Level 2 folder name
 * @param {string} keyword - The keyword (used in filename)
 * @returns {object|null} Parsed article data
 */
function readArticle(code, f1, f2, keyword) {
  const cacheKey = `${f1}/${f2}/${code}`;
  const cached = contentCache.get(cacheKey);
  if (cached) return cached;

  const filename = `${code} ${keyword}`;
  const filePath = path.resolve(config.dataDir, f1, f2, filename);

  try {
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    // Enrich with metadata
    const stat = fs.statSync(filePath);
    data._meta = {
      code,
      f1,
      f2,
      filename,
      filePath,
      fileSize: stat.size,
      modified: stat.mtime.toISOString(),
      created: stat.birthtime.toISOString(),
    };

    contentCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`[ContentReader] Error reading ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Format hybrid Markdown/HTML content into clean HTML
 * Handles: bold (**), bullets (-), numbering (1.), tables, and paragraphs (\n\n)
 */
function formatContent(html) {
  if (!html) return '';

  let content = html;

  // 1. Convert Markdown Bold: **text** -> <strong>text</strong>
  content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 2. Convert Markdown Bullets: \n- text -> \n<li>text</li> (wrapped later)
  content = content.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> into <ul>
  content = content.replace(/(<li>.+<\/li>)+/g, '<ul>$&</ul>');

  // 3. Convert Markdown Numbering: \n1. text -> \n<li class="num">text</li>
  content = content.replace(/^\s*\d+\.\s+(.+)$/gm, '<li class="num">$1</li>');
  // Wrap consecutive numbering <li> into <ol>
  content = content.replace(/(<li class="num">.+<\/li>)+/g, '<ol>$&</ol>');
  // Clean up the temporary class
  content = content.replace(/ class="num"/g, '');

  // 4. Handle Paragraphs (\n\n) - avoid wrapping existing HTML tags (h1-h6, table, ul, ol, li)
  // Split by double newlines, wrap non-HTML blocks
  const blocks = content.split(/\n\s*\n/);
  const processedBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // If it already starts with a block-level HTML tag, don't wrap in <p>
    if (/^<(h[1-6]|p|ul|ol|li|table|div|blockquote|section|aside|header|footer)/i.test(trimmed)) {
      return trimmed;
    }
    return `<p>${trimmed}</p>`;
  });

  return processedBlocks.join('\n');
}

/**
 * Extract plain text from HTML content (for meta description)
 */
function htmlToText(html, maxLength = 160) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')          // Strip HTML tags
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Strip markdown bold
    .replace(/\s+/g, ' ')             // Collapse whitespace
    .trim()
    .substring(0, maxLength);
}

/**
 * Count paragraphs in HTML content
 */
function countParagraphs(html) {
  if (!html) return 0;
  const matches = html.match(/<\/?(p|h[1-6]|ul|ol|li|blockquote)[\s>]/gi);
  return matches ? matches.length : 0;
}

module.exports = { readArticle, htmlToText, countParagraphs, formatContent, clearCache };
