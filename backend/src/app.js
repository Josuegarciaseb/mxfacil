const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const csrf         = require('csurf');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const passport     = require('./config/passport');
const sanitize     = require('./middlewares/sanitize');
const { addResponseIntegrity } = require('./middlewares/integrity');

const authRoutes      = require('./routes/auth.routes');
const oauthRoutes     = require('./routes/oauth.routes');
const usuarioRoutes   = require('./routes/usuario.routes');
const direccionRoutes = require('./routes/direccion.routes');
const proveedorRoutes = require('./routes/proveedor.routes');
const categoriaRoutes = require('./routes/categorias.routes');
const productoRoutes  = require('./routes/producto.routes');
const inventarioRoutes= require('./routes/inventario.routes');
const pedidoRoutes    = require('./routes/pedido.routes');
const pagoRoutes      = require('./routes/pago.routes');
const envioRoutes     = require('./routes/envio.routes');

const app = express();

// 1. ENCABEZADOS DE SEGURIDAD (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  frameguard:    { action: 'deny' },
  xssFilter:     true,
  hsts:          { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy:{ policy: 'strict-origin-when-cross-origin' },
  noSniff:       true,
}));

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

// 2. CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Data-Signature'],
}));

// 3. PARSERS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 3b. ARCHIVOS ESTÁTICOS — imágenes de productos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 4. RATE LIMITING
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/login',    rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/register', rateLimit({ windowMs: 15*60*1000, max: 5,  standardHeaders: true, legacyHeaders: false }));

// 5. SANITIZACIÓN — Prevención XSS / inyección de código
app.use(sanitize);

// 6. INTEGRIDAD DE RESPUESTAS — Hash SHA-256 en X-Content-Hash
app.use(addResponseIntegrity);

// 7. PASSPORT — OAuth2 Google
app.use(passport.initialize());

// 8. ADVERTENCIA SELF-XSS
app.get('/api/console-warning.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`(function(){var s1='font-size:22px;font-weight:bold;color:#c0392b;';var s2='font-size:14px;color:#333;';console.log('%c⛔ ADVERTENCIA — Self-XSS Attack',s1);console.log('%cSi alguien te pidió copiar código aquí, es un ataque Self-XSS. NO lo hagas.',s2);})();`);
});

// 9. CSRF Token
const csrfProtection = csrf({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' } });
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 10. RUTAS
app.use('/api/auth',        authRoutes);
app.use('/api/auth',        oauthRoutes);
app.use('/api/usuario',     usuarioRoutes);
app.use('/api/direcciones', direccionRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/categorias',  categoriaRoutes);
app.use('/api/productos',   productoRoutes);
app.use('/api/inventario',  inventarioRoutes);
app.use('/api/pedidos',     pedidoRoutes);
app.use('/api/pagos',       pagoRoutes);
app.use('/api/envios',      envioRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'mxfacil API up', timestamp: new Date().toISOString() });
});

// 11. ERROR HANDLER
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') return res.status(403).json({ message: 'Token CSRF inválido o expirado' });
  if (err.message?.includes('CORS')) return res.status(403).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
