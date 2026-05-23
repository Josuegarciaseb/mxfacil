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

// Confiar en el proxy de Railway/Heroku para leer la IP real del cliente
// Sin esto, req.ip sería la IP del load balancer y TODOS los usuarios
// compartirían el mismo contador de rate limit (100 reqs/15min para todos)
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
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Data-Signature'],
}));

// 3. PARSERS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 3b. ARCHIVOS ESTÁTICOS — imágenes de productos
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

// 6. INTEGRIDAD DE RESPUESTAS — Hash SHA-256 en X-Content-Hash
app.use(addResponseIntegrity);

// 7. PASSPORT — OAuth2 Google
app.use(passport.initialize());

// 8. ADVERTENCIA SELF-XSS
app.get('/api/console-warning.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`(function(){var s1='font-size:22px;font-weight:bold;color:#c0392b;';var s2='font-size:14px;color:#333;';console.log('%c⛔ ADVERTENCIA — Self-XSS Attack',s1);console.log('%cSi alguien te pidió copiar código aquí, es un ataque Self-XSS. NO lo hagas.',s2);})();`);
});

// 9. CSRF — Protección real para todas las rutas que modifican estado
//
// Flujo:
//   1. El frontend llama GET /api/csrf-token al iniciar (fetchCsrfToken en App.jsx).
//      csurf crea el secreto CSRF en una cookie HttpOnly y devuelve el token derivado.
//   2. El frontend guarda el token en memoria (_csrfToken en api.js).
//   3. En cada POST/PUT/PATCH/DELETE el frontend adjunta X-CSRF-Token: <token>.
//   4. El middleware global compara el token con el secreto de la cookie → 403 si no coincide.
//
// Exclusiones justificadas:
//   • GET / HEAD / OPTIONS — métodos seguros (sin efecto de estado)
//   • /api/pagos/mercadopago/webhook — llamada de servidor a servidor (sin cookie de navegador)
//   • /api/auth/google/callback — Passport lo maneja con su propio flujo OAuth
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

// El frontend obtiene aquí el token inicial; csurf genera la cookie en esta llamada.
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Aplicar CSRF a todas las rutas mutantes excepto las dos de arriba
const CSRF_SKIP = [
  '/api/pagos/mercadopago/webhook',
  '/api/auth/google/callback',
];

app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (CSRF_SKIP.some((p) => req.originalUrl.startsWith(p))) return next();
  return csrfProtection(req, res, next);
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
