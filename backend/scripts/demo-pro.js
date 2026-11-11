// Only seeds the local demonstration; never resets existing accounts or payments.
require('dotenv').config();
const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');
async function run() {
  if (process.env.NODE_ENV !== 'development' || !['127.0.0.1','localhost'].includes(process.env.DB_HOST) || process.env.DB_NAME !== 'mxfacil') {
    throw new Error('Este script solo admite la base local mxfacil en desarrollo');
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const email = 'vendedor@prueba.mx';
    const [[existing]] = await conn.query('SELECT id FROM usuario WHERE email=?', [email]);
    if (existing) { console.log('La cuenta de demostración ya existe; no se modificó.'); await conn.rollback(); return; }
    const hash = await bcrypt.hash('prueba123', 12);
    const [user] = await conn.query("INSERT INTO usuario (nombre,email,password_hash,rol) VALUES (?,?,?,'vendedor')", ['Vendedor Demo', email, hash]);
    const [prov] = await conn.query("INSERT INTO proveedor (usuario_id,nombre,verificado) VALUES (?,?,'aprobado')", [user.insertId,'Huerta Demo Colima']);
    for (const [name, category, price, presentation] of [
      ['Caja de mangos','Frutas y verduras',250,'Caja de 10 kg'],
      ['Aguacate Hass','Frutas y verduras',400,'Caja de 10 kg'],
      ['Arroz blanco','Granos y legumbres',180,'Costal de 5 kg'],
      ['Semilla de calabaza','Semillas',300,'Bolsa de 2 kg'],
    ]) {
      const [product] = await conn.query(`INSERT INTO producto (proveedor_id,categoria_id,nombre,precio,presentacion,descripcion)
        VALUES (?,(SELECT id FROM categoria WHERE nombre=?),?,?,?,'Producto de demostración para la exposición')`, [prov.insertId,category,name,price,presentation]);
      await conn.query('INSERT INTO inventario (producto_id,stock) VALUES (?,30)', [product.insertId]);
    }
    await conn.commit();
    console.log('Cuenta de demostración creada: vendedor@prueba.mx / prueba123');
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}
run().catch(error=>{ console.error(error.code || error.message); process.exitCode=1; }).finally(()=>pool.end());
