// Vista previa en loopback. Solo se copian credenciales de pasarelas de prueba.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('dotenv');
const { testEnvironment, seed } = require('./helpers');
const archivo = path.join(__dirname,'../.env');
const config = fs.existsSync(archivo) ? parse(fs.readFileSync(archivo)) : {};
testEnvironment('mxfacil_audit_ui');
process.env.ALLOWED_ORIGINS = 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174';
process.env.FRONTEND_URL = 'http://127.0.0.1:5173';
for (const name of ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET',
  'MERCADOPAGO_ACCESS_TOKEN','MERCADOPAGO_WEBHOOK_SECRET','GOOGLE_CLIENT_ID']) {
  delete process.env[name];
}
if (/^sk_test_/.test(config.STRIPE_SECRET_KEY || '')) {
  process.env.STRIPE_SECRET_KEY = config.STRIPE_SECRET_KEY;
  if (config.STRIPE_WEBHOOK_SECRET) process.env.STRIPE_WEBHOOK_SECRET = config.STRIPE_WEBHOOK_SECRET;
}
if (config.PAYPAL_ENV === 'sandbox' && config.PAYPAL_CLIENT_ID && config.PAYPAL_CLIENT_SECRET) {
  process.env.PAYPAL_CLIENT_ID = config.PAYPAL_CLIENT_ID;
  process.env.PAYPAL_CLIENT_SECRET = config.PAYPAL_CLIENT_SECRET;
}
if (config.MERCADOPAGO_ENV === 'sandbox' && /^TEST-/.test(config.MERCADOPAGO_ACCESS_TOKEN || '') &&
    config.MERCADOPAGO_WEBHOOK_SECRET && /^https:\/\//.test(config.BACKEND_URL || '') &&
    /^https:\/\//.test(config.FRONTEND_URL || '')) {
  for (const name of ['MERCADOPAGO_ACCESS_TOKEN','MERCADOPAGO_WEBHOOK_SECRET','MERCADOPAGO_ENV','BACKEND_URL','FRONTEND_URL']) {
    process.env[name] = config[name];
  }
}
const existing = process.argv[2];
if (existing && !/^mxfacil_audit_ui_[a-f0-9]{12}$/.test(existing)) {
  throw new Error('Solo se admite una base de vista previa local');
}
if (existing) process.env.DB_NAME = existing;

(existing ? Promise.resolve() : seed()).then(() => {
  require('../src/app').listen(3001, '127.0.0.1', () => {
    require('../src/services/reservas.service').startReservationWorker();
    console.log('Tienda de pruebas en http://127.0.0.1:3001');
  });
}).catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
