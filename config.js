/**
 * AGC Engine Configuration
 * Edit this file to change settings — NO restart needed for template changes
 * Server restart only needed if you change THIS file or route files
 */

/**
 * AGC Engine Configuration - v2.3 (PageSpeed Ultra Edition)
 * Lihat CHANGELOG.md untuk riwayat pembaruan dan fitur baru.
 */

module.exports = {
  port: process.env.PORT || 3000,
  forceHttps: true, // Set to true to force https:// in all URLs (Sitemap, RSS, etc)

  // ── Permalink / URL Format ─────────────────────────────
  // Model 'a' → /{dinamis}/{f1}/{f2}/{action}{code}{slug}   (4-segment, prefix kata acak per artikel)
  // Model 'b' → /{f1}/{f2}/{action}{code}{slug}             (3-segment, lebih pendek)
  // Model 'c' → /{f1}/{f2}/{slug} ATAU /{f2}/{f1}/{slug}    (3-segment, urutan folder acak)
  permalinkModel: 'c',    // 'a', 'b', atau 'c'
  urlShuffling: true,     // Toggle for dynamic URL shuffling on every refresh
  urlDelimiter: 'mix',    // 'dash' (-), 'underscore' (_), or 'mix' (both)

  // ── Special Link Redirects ────────────────────────────
  specialRedirects: {
    enabled: true,
    keywords: ['unblock game', 'unblocked game'],
    targetUrl: 'https://unblockgamegplus.github.io/'
  },

  // Data directories (Auto-detect Filtered vs Full)
  dataDir: require('fs').existsSync(path.join(__dirname, 'data')) 
    ? path.join(__dirname, 'data') 
    : path.join(__dirname, 'apalah'),
  keywDir: path.join(__dirname, 'keyw'),

  // Pathing for subdirectory hosting (GitHub Pages)
  // Set this to '/your-repo-name' if hosted on a subfolder
  basePath: process.env.BASE_PATH || '',

  // Auto-domain: detected from request headers
  // These are fallbacks only
  siteName: 'Knowledge Base',
  defaultDescription: 'Explore comprehensive articles, guides, and answers to your questions.',
  language: 'en',

  // SEO verification codes (leave empty if not needed)
  googleVerification: '',
  bingVerification: '',

  // Google Analytics
  googleAnalyticsId: 'G-Q7YYG6BQ16',

  // Histats tracking (Renamed for unique collision prevention)
  ST_ID_Situs: '5018396',      // Per-site Histats ID
  ST_ID_Global: '4962189',     // Global Histats ID

  // Cache settings
  cache: {
    keywordIndexTTL: 3600000,   // Rebuild keyword index every 1 hour (ms)
    contentCacheMax: 500,        // Max articles in LRU content cache
    homepageArticles: 50,        // Articles shown on homepage
    categoryPerPage: 50,         // Articles per category page
    searchPerPage: 30,           // Search results per page
    imageProxyCacheMax: 100,     // Max images cached in RAM (Low-RAM safety)
  },

  // Adsterra Ad Configuration
  ads: {
    enabled: true,

    // Banner ad under article title (728x90)
    bannerUnderTitle: `<div class="ad-slot ad-under-title" id="ad-under-title">
<script>
  atOptions = {
    'key' : '72aae8a75da17a34e48ed84feaa311bf',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
</script>
<script src="https://biggerbreakerfind.com/72aae8a75da17a34e48ed84feaa311bf/invoke.js"></script>
</div>`,

    // Banner ad after paragraph 3 (300x250)
    bannerAfterP3: `<div class="ad-slot ad-after-p3" id="ad-after-p3">
<script>
  atOptions = {
    'key' : '5c2ef2cb97dff829617ea4c4e1d5ca7b',
    'format' : 'iframe',
    'height' : 250,
    'width' : 300,
    'params' : {}
  };
</script>
<script src="https://biggerbreakerfind.com/5c2ef2cb97dff829617ea4c4e1d5ca7b/invoke.js"></script>
</div>`,

    // Banner ad mid-article (728x90)
    bannerMidArticle: `<div class="ad-slot ad-mid" id="ad-mid-article">
<script>
  atOptions = {
    'key' : '4b03159602cba0243869c415124b923e',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
</script>
<script src="https://biggerbreakerfind.com/4b03159602cba0243869c415124b923e/invoke.js"></script>
</div>`,

    // Banner ad under article (728x90 - reuse iklan 1)
    bannerUnderArticle: `<div class="ad-slot ad-under-article" id="ad-under-article">
<script>
  atOptions = {
    'key' : '72aae8a75da17a34e48ed84feaa311bf',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
</script>
<script src="https://biggerbreakerfind.com/72aae8a75da17a34e48ed84feaa311bf/invoke.js"></script>
</div>`,

    // Banner Sticky Floating Ad (728x90)
    bannerSticky: `<div class="ad-slot ad-sticky" id="ad-sticky-footer">
<script>
  atOptions = {
    'key' : '72aae8a75da17a34e48ed84feaa311bf',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
</script>
<script src="https://biggerbreakerfind.com/72aae8a75da17a34e48ed84feaa311bf/invoke.js"></script>
</div>`,

    // Adsterra Social Bar
    socialBar: `<script src="https://biggerbreakerfind.com/48/5f/74/485f7426bb614d7e620b0e088268e010.js"></script>`,

    // Adsterra Direct Link URL for popup
    directLinkUrl: 'https://biggerbreakerfind.com/m5c9h7sz5?key=b5c00cea2c5f93da4bf36a756da22d91',

    // Popup settings
    popup: {
      enabled: true,
      delaySeconds: 3,
      cooldownHours: 24,
    }
  },

  // Security & Bot Blocker settings
  security: {
    // List of common scrapers and aggressive bots to block
    blockedBots: [
      'ahrefs', 'semrush', 'mj12bot', 'dotbot', 'rogerbot',
      'megaindex', 'zoominfobot', 'exabot', 'petalbot',
      'commoncrawl', 'gptbot', 'ccbot', 'facebookexternalhit',
      'meta-external', 'facebot', 'metabot', 'meta-externalagent',
      'meta-webindexer', 'blexbot', 'dataforseobot', 'linkfluence',
      'seokicks', 'serpstatbot', 'seznambot', 'bytespider', 'sogou',
      'siteauditbot', 'screaming frog', 'screamingfrog', 'spyfu',
      'mozdomainstats', 'proximic', 'wotbox', 'cliqzbot', 'rankactive',
      'netcraftsurveyagent', 'webdatastats', 'grapeshotcrawler', 'nutch',
      'libwww-perl', 'python-requests', 'python-urllib', 'scrapy',
      'headlesschrome', 'phantomjs', 'nightmare', 'zmeu', 'masscan', 'ClaudeBot', 'AmazonBot', 'sqlmap'
    ]
  },

  // ── Theme Settings ────────────────────────────────────
  homepageVersion: 'v3', // Choices: 'v1' (Classic), 'v2' (Premium Dynamic), 'v3' (News & Blog Hybrid)
  activeTheme: 'midnight-purple', // Choices: 'premium-dark', 'clean-light', 'deep-ocean', 'forest-nature', 'sunset-glow', 'midnight-purple', 'nordic-sky', 'desert-gold', 'cyber-lime', 'rose-quartz'
  themes: {
    'premium-dark': {
      bgPrimary: '#0a0a0f', bgSecondary: '#12121a', bgCard: 'rgba(255, 255, 255, 0.04)',
      textPrimary: '#e8e8ed', textSecondary: '#8b8b9e', textMuted: '#5a5a6e',
      accent: '#6c5ce7', accentLight: '#a29bfe', accentGlow: 'rgba(108, 92, 231, 0.3)',
      gradient: 'linear-gradient(135deg, #6c5ce7, #a29bfe, #74b9ff)'
    },
    'clean-light': {
      bgPrimary: '#f8f9fa', bgSecondary: '#ffffff', bgCard: 'rgba(0, 0, 0, 0.03)',
      textPrimary: '#111111', textSecondary: '#444444', textMuted: '#777777',
      accent: '#2563eb', accentLight: '#3b82f6', accentGlow: 'rgba(37, 99, 235, 0.15)',
      gradient: 'linear-gradient(135deg, #2563eb, #3b82f6, #06b6d4)'
    },
    'deep-ocean': {
      bgPrimary: '#000b18', bgSecondary: '#00162d', bgCard: 'rgba(0, 168, 255, 0.05)',
      textPrimary: '#dff9fb', textSecondary: '#95afc0', textMuted: '#535c68',
      accent: '#00a8ff', accentLight: '#9c88ff', accentGlow: 'rgba(0, 168, 255, 0.25)',
      gradient: 'linear-gradient(135deg, #00a8ff, #9c88ff, #00d2d3)'
    },
    'forest-nature': {
      bgPrimary: '#0d1a0d', bgSecondary: '#152615', bgCard: 'rgba(46, 204, 113, 0.05)',
      textPrimary: '#eefef4', textSecondary: '#95a5a6', textMuted: '#4d5d4d',
      accent: '#27ae60', accentLight: '#2ecc71', accentGlow: 'rgba(39, 174, 96, 0.25)',
      gradient: 'linear-gradient(135deg, #27ae60, #2ecc71, #f1c40f)'
    },
    'sunset-glow': {
      bgPrimary: '#1a0d1a', bgSecondary: '#261526', bgCard: 'rgba(238, 69, 64, 0.06)',
      textPrimary: '#fff0f5', textSecondary: '#d8b4d8', textMuted: '#6e5a6e',
      accent: '#ee4540', accentLight: '#ff7675', accentGlow: 'rgba(238, 69, 64, 0.25)',
      gradient: 'linear-gradient(135deg, #ee4540, #ff7675, #ff9f43)'
    },
    'midnight-purple': {
      bgPrimary: '#0a000a', bgSecondary: '#150015', bgCard: 'rgba(155, 89, 182, 0.05)',
      textPrimary: '#f5f0f5', textSecondary: '#a29bfe', textMuted: '#5a4f6e',
      accent: '#9b59b6', accentLight: '#d6a2e8', accentGlow: 'rgba(155, 89, 182, 0.3)',
      gradient: 'linear-gradient(135deg, #9b59b6, #a29bfe, #fd79a8)'
    },
    'nordic-sky': {
      bgPrimary: '#f0f4f8', bgSecondary: '#ffffff', bgCard: 'rgba(0, 122, 204, 0.03)',
      textPrimary: '#1e2d3e', textSecondary: '#546e7a', textMuted: '#90a4ae',
      accent: '#007acc', accentLight: '#4fc3f7', accentGlow: 'rgba(0, 122, 204, 0.15)',
      gradient: 'linear-gradient(135deg, #007acc, #4fc3f7, #a29bfe)'
    },
    'desert-gold': {
      bgPrimary: '#f9f5f0', bgSecondary: '#ffffff', bgCard: 'rgba(139, 69, 19, 0.03)',
      textPrimary: '#3c2f2f', textSecondary: '#8d6e63', textMuted: '#bcaaa4',
      accent: '#d4af37', accentLight: '#ffcc33', accentGlow: 'rgba(212, 175, 55, 0.2)',
      gradient: 'linear-gradient(135deg, #af8c11, #d4af37, #f1c40f)'
    },
    'cyber-lime': {
      bgPrimary: '#000000', bgSecondary: '#080808', bgCard: 'rgba(57, 255, 20, 0.04)',
      textPrimary: '#f0fff0', textSecondary: '#8bc34a', textMuted: '#3e4d3e',
      accent: '#39ff14', accentLight: '#ccff00', accentGlow: 'rgba(57, 255, 20, 0.3)',
      gradient: 'linear-gradient(135deg, #39ff14, #ccff00, #16a085)'
    },
    'rose-quartz': {
      bgPrimary: '#fffafa', bgSecondary: '#ffffff', bgCard: 'rgba(231, 76, 60, 0.02)',
      textPrimary: '#4a3c3c', textSecondary: '#a58d8d', textMuted: '#d7c0c0',
      accent: '#e08283', accentLight: '#f1a9a0', accentGlow: 'rgba(224, 130, 131, 0.2)',
      gradient: 'linear-gradient(135deg, #e08283, #f1a9a0, #fab1a0)'
    }
  }
};
