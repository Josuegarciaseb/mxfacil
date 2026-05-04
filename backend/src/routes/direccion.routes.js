// src/routes/direccion.routes.js
const express = require('express');
const router = express.Router();
const dirCtrl = require('../controllers/direccion.controller');
const auth = require('../middlewares/auth');

// Todas las rutas de direcciones requieren usuario logueado
router.get('/', auth, dirCtrl.listDirecciones);
router.post('/', auth, dirCtrl.createDireccion);
router.put('/:id', auth, dirCtrl.updateDireccion);
router.delete('/:id', auth, dirCtrl.deleteDireccion);

module.exports = router;
