/**
 * Ad Injector
 * Injects Adsterra ad codes into article HTML content
 * Positions: after title, after 3rd paragraph, mid-article, under article
 */

const config = require('../config');

/**
 * Split HTML content by paragraphs/sections and inject ads
 * @param {string} html - The article HTML content
 * @returns {string} HTML with ads injected
 */
function injectAds(html) {
  if (!config.ads.enabled || !html) return html || '';

  // Split content by closing tags of block elements
  // We track paragraph-like blocks: </p>, </h2>, </h3>, </ul>, </ol>, </blockquote>
  const blockPattern = /(<\/(?:p|h[2-6]|ul|ol|blockquote|table|div)>)/gi;
  const parts = html.split(blockPattern);

  // Rebuild and count block elements
  let blockCount = 0;
  let totalBlocks = 0;
  const rebuilt = [];

  // First pass: count total blocks
  for (const part of parts) {
    if (blockPattern.test(part)) {
      blockPattern.lastIndex = 0;
      totalBlocks++;
    }
  }
  blockPattern.lastIndex = 0;

  const midPoint = Math.floor(totalBlocks / 2);
  let adAfterP3Inserted = false;
  let adMidInserted = false;

  for (const part of parts) {
    rebuilt.push(part);

    if (blockPattern.test(part)) {
      blockPattern.lastIndex = 0;
      blockCount++;

      // After 3rd block element
      if (blockCount === 3 && !adAfterP3Inserted) {
        rebuilt.push(`\n${config.ads.bannerAfterP3}\n`);
        adAfterP3Inserted = true;
      }

      // Mid-article
      if (blockCount === midPoint && !adMidInserted && midPoint > 4) {
        rebuilt.push(`\n${config.ads.bannerMidArticle}\n`);
        adMidInserted = true;
      }
    }
  }

  return rebuilt.join('');
}

/**
 * Get the ad HTML for a specific position
 */
function getAdSlot(position) {
  if (!config.ads.enabled) return '';

  switch (position) {
    case 'under-title': return config.ads.bannerUnderTitle || '';
    case 'after-p3': return config.ads.bannerAfterP3 || '';
    case 'mid-article': return config.ads.bannerMidArticle || '';
    case 'under-article': return config.ads.bannerUnderArticle || '';
    case 'social-bar': return config.ads.socialBar || '';
    default: return '';
  }
}

module.exports = { injectAds, getAdSlot };
