const config = require('../config');
const sessionManager = require('../session/SessionManager');

function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (!sessionManager.canCreate(ip)) {
    return res.status(429).json({ error: 'Limite de sessões simultâneas atingido' });
  }
  req.clientIP = ip;
  next();
}

module.exports = rateLimit;
