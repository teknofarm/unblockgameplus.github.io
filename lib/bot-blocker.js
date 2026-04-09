/**
 * Bot Blocker Middleware
 * Prevents aggressive scrapers and social bots from consuming resources.
 */
const config = require('../config');

module.exports = function(req, res, next) {
  const ua = (req.get('User-Agent') || '').toLowerCase();
  const blockedBots = config.security.blockedBots;

  // Faster check using some()
  const isBlocked = blockedBots.some(bot => ua.includes(bot));

  if (isBlocked) {
    // Log blocked attempt (Optional, can be disabled for performance)
    // console.log(`[Security] Blocked bot: ${ua}`);

    // Return 403 Forbidden and end request immediately
    return res.status(403).send('Forbidden: Bot Detected.');
  }

  next();
};
