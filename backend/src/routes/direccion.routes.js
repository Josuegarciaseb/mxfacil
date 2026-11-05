// src/routes/direccion.routes.js
const express = require('express');
const router = express.Router();
const dirCtrl = require('../controllers/direccion.controller');
const auth = require('../middlewares/auth');
const asyncRoute = require('../utils/async-route');

// Todas las rutas de direcciones requieren usuario logueado
router.get('/', auth, dirCtrl.listDirecciones);
router.post('/', auth, asyncRoute(dirCtrl.createDireccion));
router.put('/:id', auth, asyncRoute(dirCtrl.updateDireccion));
router.delete('/:id', auth, asyncRoute(dirCtrl.deleteDireccion));

module.exports = router;
