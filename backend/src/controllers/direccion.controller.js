// src/controllers/direccion.controller.js
const pool = require('../config/db');
const { isValidCP, isValidLocationName } = require('../utils/validators');

function validAddressFields(body) {
  for (const [key, max] of Object.entries({linea1:160, ciudad:80, estado:80, pais:60})) {
    const value = body[key];
    if (value != null && (typeof value !== 'string' || !value.trim() || value.trim().length > max)) return false;
  }
  return body.es_principal == null || [true,false,0,1,'0','1'].includes(body.es_principal);
}
const isPrimary = value => [true, 1, '1'].includes(value);


// GET /api/direcciones
// Lista las direcciones del usuario autenticado
exports.listDirecciones = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT id, usuario_id, linea1, ciudad, estado, cp, pais, es_principal
       FROM direccion
       WHERE usuario_id = ?
       ORDER BY es_principal DESC, id DESC`,
      [userId]
    );

    return res.json(rows);
  } catch (err) {
    console.error('Error listDirecciones:', err);
    return res.status(500).json({ message: 'Error al obtener direcciones' });
  }
};

// POST /api/direcciones
// Crea una nueva dirección para el usuario autenticado
exports.createDireccion = async (req, res) => {
  const userId = req.user.id;
  const {
    linea1,
    ciudad,
    estado,
    cp,
    pais,
    es_principal
  } = req.body;

  // Campos obligatorios
  if (!validAddressFields(req.body) || !linea1 || !ciudad || !estado || !cp) {
    return res.status(400).json({
      message: 'linea1, ciudad, estado y cp son obligatorios'
    });
  }

  // VALIDACIONES

  // ciudad solo letras y espacios
  if (!isValidLocationName(ciudad)) {
    return res.status(400).json({
      message: 'La ciudad solo puede contener letras y espacios, sin números ni símbolos'
    });
  }

  // estado solo letras y espacios
  if (!isValidLocationName(estado)) {
    return res.status(400).json({
      message: 'El estado solo puede contener letras y espacios, sin números ni símbolos'
    });
  }

  // país: si viene, validar igual. Si no viene, usamos "México"
  const paisFinal = pais || 'México';
  if (!isValidLocationName(paisFinal)) {
    return res.status(400).json({
      message: 'El país solo puede contener letras y espacios, sin números ni símbolos'
    });
  }

  // CP: 5 dígitos
  if (!isValidCP(cp)) {
    return res.status(400).json({
      message: 'El código postal debe contener exactamente 5 dígitos numéricos'
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Si esta nueva dirección será principal, quitar bandera a las demás
    await conn.query('SELECT id FROM usuario WHERE id=? FOR UPDATE',[userId]);
    if (isPrimary(es_principal)) {
      await conn.query(
        'UPDATE direccion SET es_principal = 0 WHERE usuario_id = ?',
        [userId]
      );
    }

    const [result] = await conn.query(
      `
      INSERT INTO direccion
        (usuario_id, linea1, ciudad, estado, cp, pais, es_principal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        linea1.trim(),
        ciudad.trim(),
        estado.trim(),
        String(cp).trim(),
        paisFinal.trim(),
        isPrimary(es_principal) ? 1 : 0
      ]
    );

    const newId = result.insertId;

    const [rows] = await conn.query(
      `SELECT id, usuario_id, linea1, ciudad, estado, cp, pais, es_principal
       FROM direccion
       WHERE id = ?`,
      [newId]
    );

    await conn.commit();
    return res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Error createDireccion:', err);
    return res.status(500).json({ message: 'Error al crear dirección' });
  } finally {
    conn.release();
  }
};


// PUT /api/direcciones/:id
// Actualiza una dirección del usuario
exports.updateDireccion = async (req, res) => {
  if (!validAddressFields(req.body)) return res.status(400).json({message:'Verifica los campos de la dirección'});
  const userId = req.user.id;
  const dirId = req.params.id;
  const {
    linea1,
    ciudad,
    estado,
    cp,
    pais,
    es_principal
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar que la dirección sea del usuario
    await conn.query('SELECT id FROM usuario WHERE id=? FOR UPDATE',[userId]);
    const [existe] = await conn.query(
      'SELECT * FROM direccion WHERE id = ? AND usuario_id = ?',
      [dirId, userId]
    );
    if (!existe.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Dirección no encontrada' });
    }

    const actual = existe[0];

    // === VALIDACIONES SOLO SI VIENEN CAMPOS ===

    if (ciudad != null) {
      if (!isValidLocationName(ciudad)) {
        await conn.rollback();
        return res.status(400).json({
          message: 'La ciudad solo puede contener letras y espacios, sin números ni símbolos'
        });
      }
    }

    if (estado != null) {
      if (!isValidLocationName(estado)) {
        await conn.rollback();
        return res.status(400).json({
          message: 'El estado solo puede contener letras y espacios, sin números ni símbolos'
        });
      }
    }

    if (pais != null) {
      if (!isValidLocationName(pais)) {
        await conn.rollback();
        return res.status(400).json({
          message: 'El país solo puede contener letras y espacios, sin números ni símbolos'
        });
      }
    }

    if (cp != null) {
      if (!isValidCP(cp)) {
        await conn.rollback();
        return res.status(400).json({
          message: 'El código postal debe contener exactamente 5 dígitos numéricos'
        });
      }
    }

    // Si la marcamos como principal, quitar esa bandera de las demás
    if (es_principal === 1 || es_principal === true || es_principal === '1') {
      await conn.query(
        'UPDATE direccion SET es_principal = 0 WHERE usuario_id = ?',
        [userId]
      );
    }

    await conn.query(
      `
      UPDATE direccion
      SET linea1 = ?, ciudad = ?, estado = ?, cp = ?, pais = ?, es_principal = ?
      WHERE id = ?
      `,
      [
        linea1?.trim() || actual.linea1,
        ciudad?.trim() || actual.ciudad,
        estado?.trim() || actual.estado,
        cp == null ? actual.cp : String(cp).trim(),
        pais?.trim() || actual.pais,
        es_principal == null ? actual.es_principal : Number(isPrimary(es_principal)),
        dirId
      ]
    );

    const [rows] = await conn.query(
      `SELECT id, usuario_id, linea1, ciudad, estado, cp, pais, es_principal
       FROM direccion
       WHERE id = ?`,
      [dirId]
    );

    await conn.commit();
    return res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Error updateDireccion:', err);
    return res.status(500).json({ message: 'Error al actualizar dirección' });
  } finally {
    conn.release();
  }
};


// DELETE /api/direcciones/:id
// Elimina una dirección del usuario
// Si era la principal y quedan otras, pone una de ellas como principal
exports.deleteDireccion = async (req, res) => {
  const userId = req.user.id;
  const dirId = req.params.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar que la dirección sea del usuario
    const [rowsDir] = await conn.query(
      'SELECT id, es_principal FROM direccion WHERE id = ? AND usuario_id = ?',
      [dirId, userId]
    );
    if (!rowsDir.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Dirección no encontrada' });
    }

    const eraPrincipal = rowsDir[0].es_principal === 1;

    // Eliminar
    await conn.query(
      'DELETE FROM direccion WHERE id = ? AND usuario_id = ?',
      [dirId, userId]
    );

    // Si era principal, asignar otra como principal (si existe alguna)
    if (eraPrincipal) {
      const [otras] = await conn.query(
        'SELECT id FROM direccion WHERE usuario_id = ? ORDER BY id ASC LIMIT 1',
        [userId]
      );
      if (otras.length) {
        const nuevaPrincipalId = otras[0].id;
        await conn.query(
          'UPDATE direccion SET es_principal = 1 WHERE id = ?',
          [nuevaPrincipalId]
        );
      }
    }

    await conn.commit();
    return res.json({ message: 'Dirección eliminada correctamente' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({message:'Hay pedidos asociados a esta dirección'});
    console.error('Error deleteDireccion:', err.code);
    return res.status(500).json({ message: 'Error al eliminar dirección' });
  } finally {
    conn.release();
  }
};
