const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Deliberately never loads .env: tests cannot use production payment credentials.
function testEnvironment(database = 'mxfacil_audit') {
  delete process.env.ENVIA_API_TOKEN;
  delete process.env.ENVIA_ORIGENES_MX;
  Object.assign(process.env, {
    NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_PORT: '3318', DB_USER: 'root',
    DB_PASS: '', DB_PASSWORD: '', DB_NAME: `${database}_${crypto.randomBytes(6).toString('hex')}`,
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    HMAC_SECRET: crypto.randomBytes(32).toString('hex'),
    CSRF_SECRET: crypto.randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    GOOGLE_CLIENT_ID: 'audit-disabled', GOOGLE_CLIENT_SECRET: 'audit-disabled',
    STRIPE_SECRET_KEY: 'sk_test_audit_no_network', STRIPE_WEBHOOK_SECRET: 'whsec_audit',
    MERCADOPAGO_ACCESS_TOKEN: 'TEST-audit-no-network', MERCADOPAGO_WEBHOOK_SECRET: 'audit-webhook-secret',
    PAYPAL_CLIENT_ID: 'audit-no-network', PAYPAL_CLIENT_SECRET: 'audit-no-network', PAYPAL_ENV: 'sandbox',
    ALLOWED_ORIGINS: 'http://127.0.0.1:5174,http://localhost:5174',
    FRONTEND_URL: 'http://127.0.0.1:5174', BACKEND_URL: 'http://127.0.0.1:3001',
  });
}

async function seed() {
  const database = process.env.DB_NAME;
  if (!/^mxfacil_audit(?:_ui)?_[a-f0-9]{12}$/.test(database) || process.env.DB_HOST !== '127.0.0.1' || process.env.DB_PORT !== '3318') {
    throw new Error('Tests require the isolated local audit database on port 3318');
  }
  const conn = await mysql.createConnection({ host: '127.0.0.1', port: 3318, user: 'root', multipleStatements: true });
  try {
    await conn.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4; USE \`${database}\`;`);
    const schema = fs.readFileSync(path.join(__dirname, '../db/init.sql'), 'utf8')
      .replace(/DROP DATABASE[^;]*;/g, '').replace(/CREATE DATABASE[^;]*;/g, '').replace(/USE mxfacil;/g, '');
    await conn.query(schema);
    const hash = await bcrypt.hash('CompraPrueba!2026', 4);
    for (const [nombre, email, rol] of [
      ['Cliente Prueba', 'cliente@example.test', 'cliente'],
      ['Otra Cliente', 'otra@example.test', 'cliente'],
      ['Admin Prueba', 'admin@example.test', 'admin'],
      ['Vendedor Prueba', 'vendedor@example.test', 'vendedor'],
      ['Otro Vendedor', 'otro-vendedor@example.test', 'vendedor'],
    ]) await conn.query('INSERT INTO usuario (nombre,email,password_hash,rol) VALUES (?,?,?,?)', [nombre,email,hash,rol]);
    await conn.query("INSERT INTO direccion (usuario_id,linea1,ciudad,estado,cp,es_principal) VALUES (1,'Calle Prueba 123','Puebla','Puebla','72000',1),(2,'Otra Calle 456','Puebla','Puebla','72000',1)");
    await conn.query("INSERT INTO proveedor (usuario_id,nombre,verificado) VALUES (4,'Proveedor de prueba','aprobado'),(5,'Otro proveedor','aprobado')");
    const products = [
      [1, 'Frutas y verduras', 'Manzanas de prueba', 100, 'Caja de 5 kg', 5],
      [2, 'Granos y legumbres', 'Arroz de prueba', 0.29, 'Bolsa de 1 kg', 100],
      [1, 'Frutas y verduras', 'Jitomate de prueba', 50, 'Caja', 0],
      [1, 'Semillas', 'Semilla de calabaza de prueba', 350, 'Costal de 5 kg', 4],
    ];
    for (const [supplier, category, name, price, pack, stock] of products) {
      const [product] = await conn.execute(
        `INSERT INTO producto (proveedor_id,categoria_id,nombre,precio,presentacion)
         VALUES (?, (SELECT id FROM categoria WHERE nombre = ?), ?, ?, ?)`,
        [supplier, category, name, price, pack]
      );
      await conn.execute('INSERT INTO inventario (producto_id,stock) VALUES (?,?)', [product.insertId, stock]);
    }
  } finally { await conn.end(); }
}

module.exports = { testEnvironment, seed };
