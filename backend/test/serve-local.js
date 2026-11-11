// Disposable local storefront. The public API listens on loopback and has no
// external payment or Google credentials. Pass an existing preview database name
// to keep its orders when restarting the API after a local migration.
const { testEnvironment, seed } = require('./helpers');
testEnvironment('mxfacil_audit_ui');
process.env.ALLOWED_ORIGINS = 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174';
process.env.FRONTEND_URL = 'http://localhost:5173';
for (const name of ['STRIPE_SECRET_KEY', 'PAYPAL_CLIENT_ID', 'MERCADOPAGO_ACCESS_TOKEN', 'GOOGLE_CLIENT_ID']) {
  delete process.env[name];
}
const existing = process.argv[2];
if (existing && !/^mxfacil_audit_ui_[a-f0-9]{12}$/.test(existing)) {
  throw new Error('Solo se admite una base de vista previa local');
}
if (existing) process.env.DB_NAME = existing;

(existing ? Promise.resolve() : seed()).then(() => {
  require('../src/app').listen(3001, '127.0.0.1', () => console.log('Tienda de pruebas en http://127.0.0.1:3001'));
}).catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
