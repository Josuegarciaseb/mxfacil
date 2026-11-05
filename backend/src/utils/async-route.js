// Express 4 does not forward rejected handler promises to its error middleware.
module.exports = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
