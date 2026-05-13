const xss = require('xss');

function sanitizeValue(value) {
  if (typeof value === 'string') {
    return xss(value, {
      whiteList: {},          
      stripIgnoreTag: true,   
      stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
    });
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitized = {};
    for (const key of Object.keys(value)) {
      sanitized[key] = sanitizeValue(value[key]);
    }
    return sanitized;
  }

  return value;
}

function sanitizeMiddleware(req, res, next) {
  if (req.body)   req.body   = sanitizeValue(req.body);
  if (req.query)  req.query  = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
}

module.exports = sanitizeMiddleware;
