/**
 * Slug Utilities — Randomized format like rf_slug()
 * 
 * Uses code as seed for deterministic "randomness":
 * - CamelCase OR lowercase with random delimiters (-, _, __)
 * - Random prefix word
 * - Same code always produces the same slug format
 * 
 * URL: /{randomWord}/{p1}/{p2}/{articleSlug}
 */

const PREFIXES = [
  'read', 'guide', 'get', 'top', 'best', 'new', 'watch',
  'download', 'online', 'view', 'learn', 'info', 'doc', 'ref', 'explore'
];

const URL_PREFIX_WORDS = [
  'archive', 'post', 'news', 'daily', 'resource', 'update', 'view', 'read',
  'trending', 'hot', 'file', 'doc', 'link', 'list', 'topic', 'find', 'area',
  'hub', 'zone', 'site', 'page', 'web', 'data', 'blog', 'main', 'source'
];

const DELIMITERS = ['-', '_'];

const FOLDER_PREFIXES = [
  'cat', 'topic', 'news', 'find', 'view', 'list', 'base', 'hub', 'area', 'zone',
  'read', 'post', 'info', 'data', 'file', 'link', 'web', 'site', 'page', 'doc',
  'step', 'fast', 'free', 'best', 'top10', 'review', 'blog', 'core', 'main', 'ext'
];

/**
 * Simple hash from string → number (deterministic)
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Pick deterministic "random" value from array based on seed
 */
function pick(arr, seed, offset) {
  return arr[(seed + (offset || 0)) % arr.length];
}

/**
 * Clean string to ASCII-safe characters
 */
function cleanStr(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // Remove diacritics
    .replace(/[^a-zA-Z0-9 ]/g, '')     // Keep only alnum + space
    .trim();
}

/**
 * Convert keyword to slug using rf_slug() style
 * Uses code as seed for deterministic randomness
 * @param {string} keyword - The keyword text
 * @param {string} code - The unique code (used as random seed)
 * @returns {string} The slug part (without prefix/code)
 */
function rfSlug(keyword, code) {
  const config = require('../config');
  const clean = cleanStr(keyword);
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return code;

  let style;
  const pref = config.urlDelimiter || 'mix';
  if (pref === 'dash') style = 3;
  else if (pref === 'underscore') style = 1;
  else style = Math.floor(Math.random() * 5); // Original mix

  if (style === 0) {
    // CamelCase
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  } else {
    const lowerWords = words.map(w => w.toLowerCase());
    let slug = lowerWords[0];
    for (let i = 1; i < lowerWords.length; i++) {
      let delim = '-';
      if (style === 1) delim = '_';
      else if (style === 2) delim = DELIMITERS[Math.floor(Math.random() * DELIMITERS.length)];
      slug += delim + lowerWords[i];
    }
    return slug;
  }
}

/**
 * Build a randomized folder slug that encodes f1 and f2
 * Uses code to randomize the prefix per article
 */
function buildFolderSlug(f1, f2, code) {
  // Use code in the seed so each article in the same folder gets a different prefix
  const seed = hashCode(f1 + f2 + (code || ''));
  const prefix = pick(FOLDER_PREFIXES, seed, 7);
  return `${prefix}-f-${f1}-${f2}`;
}

/**
 * Decode folder slug back to f1 and f2
 * @returns {object|null} {f1, f2}
 */
function decodeFolderSlug(folderSlug) {
  if (!folderSlug) return null;
  const parts = folderSlug.split('-');
  
  // Strategy: search for any segment that is followed by 'f'
  // Or just find the 'f' marker and take the next two
  const fIdx = parts.indexOf('f');
  if (fIdx !== -1 && parts.length >= fIdx + 3) {
    return {
      f1: parts[fIdx + 1],
      f2: parts[fIdx + 2]
    };
  }
  return null;
}

/**
 * Build full article URL path
 * Reads config.permalinkModel:
 *   'a' → /{dynamicWord}/{f1}/{f2}/{action}{code}{slug}   (4-segment, prefix dinamis per artikel)
 *   'b' → /{f1}/{f2}/{action}{code}{slug}                 (3-segment, tanpa prefix)
 */
function buildArticleUrl(f1, f2, code, keyword) {
  const config = require('../config');
  const model  = (config.permalinkModel || 'a').toLowerCase();

  const actionPrefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const kwSlug       = rfSlug(keyword, code);
  
  // Decide delimiter style based on config
  let style;
  const pref = config.urlDelimiter || 'mix';
  if (pref === 'dash') style = 2; // Dash style
  else if (pref === 'underscore') style = 1; // Underscore style
  else style = Math.floor(Math.random() * 4); // Randomized mix

  let finalSlug;
  if (style === 0) {
    // Pure fusion
    finalSlug = `${actionPrefix}${code}${kwSlug}`;
  } else if (style === 1) {
    // Underscore
    finalSlug = `${actionPrefix}_${code}_${kwSlug}`;
  } else if (style === 2) {
    // Dash
    finalSlug = `${actionPrefix}-${code}-${kwSlug}`;
  } else {
    // Random delimiter
    const delim = DELIMITERS[Math.floor(Math.random() * DELIMITERS.length)];
    finalSlug = `${actionPrefix}${delim}${code}${delim}${kwSlug}`;
  }

  if (model === 'b') {
    return `/${f1}/${f2}/${finalSlug}`;
  } else if (model === 'c') {
    // Model 'c': Randomized folder order (f1/f2 or f2/f1)
    const isSwapped = Math.random() > 0.5;
    return isSwapped ? `/${f2}/${f1}/${finalSlug}` : `/${f1}/${f2}/${finalSlug}`;
  } else {
    const headWord = URL_PREFIX_WORDS[Math.floor(Math.random() * URL_PREFIX_WORDS.length)];
    return `/${headWord}/${f1}/${f2}/${finalSlug}`;
  }
}

/**
 * Extract code from article slug
 * The code is always 6 alphanumeric chars
 * Strategy: find the code by checking known patterns
 */
function extractCodeFromSlug(slug) {
  if (!slug) return null;

  // Strategy: search for any 6-char alphanumeric part that is preceded by a known prefix
  const parts = slug.split(/[-_]+/);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // A standalone 6-char part is only a code if the PREVIOUS part was a prefix
    // OR if it's the very first part and has exactly 6 chars (but this is risky for searches)
    if (part.length === 6 && /^[a-zA-Z0-9]{6}$/.test(part)) {
      if (i > 0 && PREFIXES.includes(parts[i-1].toLowerCase())) return part;
    }
    
    // Check if code is fused at the start of a part (common in style 0)
    for (const prefix of PREFIXES) {
      if (part.toLowerCase().startsWith(prefix.toLowerCase())) {
        const potentialCode = part.substring(prefix.length, prefix.length + 6);
        if (potentialCode.length === 6 && /^[a-zA-Z0-9]{6}$/.test(potentialCode)) {
          return potentialCode;
        }
      }
    }
  }

  return null;
}

/**
 * Build category URL
 */
function buildCategoryUrl(f1, f2) {
  if (f2) return `/page/${f1}/${f2}`;
  return `/page/${f1}`;
}

/**
 * Extract just the keyword phrase from a stylized slug
 * Example: "best_SeHsKu_sword-and-souls" -> "sword and souls"
 */
function extractKeywordFromSlug(slug) {
  if (!slug) return '';
  
  // 1. Identify the code position
  const code = extractCodeFromSlug(slug);
  if (!code) return slug.replace(/[-_]+/g, ' ');

  // 2. Clear known prefixes and the code
  let clean = slug;
  for (const prefix of PREFIXES) {
    if (clean.toLowerCase().startsWith(prefix.toLowerCase())) {
      clean = clean.substring(prefix.length);
      break;
    }
  }
  
  // Remove delimiters and the code
  clean = clean.replace(code, '');
  
  // 3. Convert remaining delimiters to spaces and trim
  return clean.replace(/[-_]+/g, ' ').trim() || 'latest articles';
}

/**
 * Check if the given keyword triggers any special redirects in config.js
 * Returns the targetUrl if matched, otherwise returns the originalUrl.
 */
function getRedirectUrl(originalUrl, keywordToCheck) {
  const config = require('../config');
  if (!config.specialRedirects || !config.specialRedirects.enabled || !keywordToCheck) return originalUrl;
  
  const kwLower = keywordToCheck.toLowerCase();
  for (const k of config.specialRedirects.keywords) {
    if (kwLower.includes(k.toLowerCase())) return config.specialRedirects.targetUrl;
  }
  return originalUrl;
}

module.exports = {
  rfSlug,
  buildArticleUrl,
  extractCodeFromSlug,
  extractKeywordFromSlug,
  buildCategoryUrl,
  buildFolderSlug,
  decodeFolderSlug,
  hashCode,
  PREFIXES,
  getRedirectUrl
};
