const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const passport     = require('./config/passport');
const sanitize     = require('./middlewares/sanitize');
const { addResponseIntegrity } = require('./middlewares/integrity');
const { csrfProtect, csrfTokenHandler } = require('./middlewares/csrf');

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

// Confiar en el proxy de Railway para leer la IP real del cliente
app.set('trust proxy', 1);

// Stripe webhook necesita raw body antes del json parser
app.post(
  '/api/pagos/stripe/webhook',
  express.raw({ type: 'application/json' }),
  require('./controllers/pago.controller').handleStripeWebhook
);

// 1. ENCABEZADOS DE SEGURIDAD (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   [
        "'self'",
        'https://js.stripe.com',
        'https://www.paypal.com',
        'https://www.paypalobjects.com',
        'https://sdk.mercadopago.com',
      ],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  [
        "'self'",
        'https://api.stripe.com',
        'https://www.paypal.com',
        'https://api-m.paypal.com',
        'https://api-m.sandbox.paypal.com',
        'https://api.mercadopago.com',
      ],
      frameSrc:    [
        "'self'",
        'https://js.stripe.com',
        'https://hooks.stripe.com',
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
      ],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  frameguard:    { action: 'sameorigin' },
  xssFilter:     true,
  hsts:          { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy:{ policy: 'strict-origin-when-cross-origin' },
  noSniff:       true,
}));

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com" "https://www.paypal.com")');
  next();
});

// 2. CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    // Permitir peticiones sin origin (Postman, Railway health checks, etc.)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Data-Signature', 'X-CSRF-Token'],
}));

// 3. PARSERS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 3b. Archivos estáticos — imágenes de productos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 4. RATE LIMITING
const isProd = process.env.NODE_ENV === 'production';
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas peticiones, intenta de nuevo más tarde' },
}));
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de inicio de sesión, espera 15 minutos' },
}));
app.use('/api/auth/register', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados registros desde esta IP, espera 15 minutos' },
}));

// 5. SANITIZACIÓN — Prevención XSS / inyección de código
app.use(sanitize);

// 5b. PROTECCIÓN CSRF — token HMAC-SHA256 firmado (Double-Submit Cookie)
app.get('/api/csrf-token', csrfTokenHandler);
app.use(csrfProtect);

// 6. INTEGRIDAD DE RESPUESTAS — Hash SHA-256 en X-Content-Hash
app.use(addResponseIntegrity);

// 7. PASSPORT — OAuth2 Google
app.use(passport.initialize());

// 8. ADVERTENCIA SELF-XSS
app.get('/api/console-warning.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`(function(){var s1='font-size:22px;font-weight:bold;color:#c0392b;';var s2='font-size:14px;color:#333;';console.log('%c⛔ ADVERTENCIA – Self-XSS Attack',s1);console.log('%cSi alguien te pidió copiar código aquí, es un ataque Self-XSS. NO lo hagas.',s2);})();`);
});


// 9. RUTAS
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

// 10. ERROR HANDLER
app.use((err, req, res, next) => {
  if (err.message?.includes('CORS')) return res.status(403).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
