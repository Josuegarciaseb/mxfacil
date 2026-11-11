const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
require('../backend/node_modules/dotenv').config({ path: path.join(root, 'backend/.env') });
const mysql = require('../backend/node_modules/mysql2/promise');

async function checkDatabase(initialize = false) {
  const database = process.env.DB_NAME || 'mxfacil';
  if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('DB_NAME solo admite letras, numeros y guiones bajos.');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    multipleStatements: initialize,
    connectTimeout: 5000,
  });
  try {
    const [tables] = await connection.execute(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [database]
    );
    if (initialize) {
      if (tables.length) throw new Error('La base ya contiene tablas. No se modifico: revisa las migraciones si corresponde.');
      const schema = fs.readFileSync(path.join(root, 'backend/db/init.sql'), 'utf8')
        .replace(/CREATE DATABASE IF NOT EXISTS mxfacil/, `CREATE DATABASE IF NOT EXISTS \`${database}\``)
        .replace(/USE mxfacil;/, `USE \`${database}\`;`);
      await connection.query(schema);
      console.log('Base de datos inicializada.');
    } else {
      await connection.query(`USE \`${database}\``);
      await connection.query('SELECT id FROM usuario LIMIT 0');
      await connection.query('SELECT id FROM producto LIMIT 0');
      console.log('Conexion y tablas principales verificadas.');
    }
  } finally {
    await connection.end();
  }
}
module.exports = checkDatabase;
if (require.main === module) checkDatabase(process.argv.includes('--init')).catch(error => {
  console.error(`MySQL: ${error.code || error.message}`);
  console.error('Revisa DB_HOST, DB_PORT, DB_USER y DB_PASS en backend/.env. Para una base nueva: npm run db:init');
  process.exitCode = 1;
});
