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

const DELIMITERS = ['-', '_', '__'];

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
  const clean = cleanStr(keyword);
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return code;

  const seed = hashCode(code);
  const useDelimiter = seed % 2; // 0 = CamelCase, 1 = delimiters

  if (!useDelimiter) {
    // CamelCase: "VegaMovies4kMovies"
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  } else {
    // Lowercase with random delimiters per word boundary
    const lowerWords = words.map(w => w.toLowerCase());
    let slug = lowerWords[0];
    for (let i = 1; i < lowerWords.length; i++) {
      const delim = pick(DELIMITERS, seed, i);
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
 * NEW SUPER-RANDOM 4-segment Format: /{randomWord}/{p1}/{p2}/{articleSlug}
 */
function buildArticleUrl(f1, f2, code, keyword) {
  const seed = hashCode(code);
  
  // 1. Pick a random prefix word for the first segment
  const headWord = pick(URL_PREFIX_WORDS, seed, 2);
  
  // 2. Randomize order of f1 and f2 segments (sometimes f1/f2, sometimes f2/f1)
  const swapFolders = seed % 2 === 0;
  const p1 = swapFolders ? f2 : f1;
  const p2 = swapFolders ? f1 : f2;

  // 3. Build the article slug with prefix
  const prefix = pick(PREFIXES, seed, 3);
  const kwSlug = rfSlug(keyword, code);
  const style = seed % 3;
  let finalSlug;
  
  if (style === 0) {
    finalSlug = `${prefix}${code}${kwSlug}`;
  } else if (style === 1) {
    const delim = pick(DELIMITERS, seed, 7);
    finalSlug = `${prefix}${delim}${code}${delim}${kwSlug}`;
  } else {
    finalSlug = `${prefix}_${code}_${kwSlug}`;
  }

  // Final 4-segment path: /word/p1/p2/slug
  return `/${headWord}/${p1}/${p2}/${finalSlug}`;
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
      if (i > 0 && PREFIXES.includes(parts[i-1])) return part;
    }
    
    // Check if code is fused at the start of a part (common in style 0)
    for (const prefix of PREFIXES) {
      if (part.startsWith(prefix)) {
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
    if (clean.startsWith(prefix)) {
      clean = clean.substring(prefix.length);
      break;
    }
  }
  
  // Remove delimiters and the code
  clean = clean.replace(code, '');
  
  // 3. Convert remaining delimiters to spaces and trim
  return clean.replace(/[-_]+/g, ' ').trim() || 'latest articles';
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
  PREFIXES
};
