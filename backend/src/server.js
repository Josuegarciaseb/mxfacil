require('dotenv').config();

const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const app    = require('./app');

const HTTP_PORT  = process.env.PORT       || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// ─── Servidor HTTPS ───────────────────────────────────────────────────────────
const certPath = path.join(__dirname, '..', 'certs');
const certFile = path.join(certPath, 'cert.pem');
const keyFile  = path.join(certPath, 'privkey.pem');

if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
  // Servidor HTTP: redirige todo a HTTPS (solo cuando hay certs)
  const httpApp = (req, res) => {
    const host = req.headers.host ? req.headers.host.replace(/:\d+$/, '') : 'localhost';
    res.writeHead(301, { Location: `https://${host}:${HTTPS_PORT}${req.url}` });
    res.end();
  };
  http.createServer(httpApp).listen(HTTP_PORT, () => {
    console.log(`[HTTP]  Servidor en http://localhost:${HTTP_PORT} → redirige a HTTPS`);
  });
  const tlsOptions = {
    cert: fs.readFileSync(certFile),
    key:  fs.readFileSync(keyFile),
    // Configuración TLS segura
    minVersion:   'TLSv1.2',
    ciphers: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256',
    ].join(':'),
    honorCipherOrder: true,
  };

  https.createServer(tlsOptions, app).listen(HTTPS_PORT, () => {
    console.log(`[HTTPS] Servidor seguro en https://localhost:${HTTPS_PORT}`);
    console.log(`[INFO]  NODE_ENV = ${process.env.NODE_ENV || 'development'}`);
  });
} else {
  // Sin certificados: solo HTTP (útil en desarrollo sin Docker)
  console.warn('[WARN]  Certificados TLS no encontrados. Iniciando solo en HTTP.');
  console.warn(`[WARN]  Para HTTPS, ejecuta: docker-compose up --build`);
  app.listen(HTTP_PORT, () => {
    console.log(`[HTTP]  API en http://localhost:${HTTP_PORT}`);
  });
}
