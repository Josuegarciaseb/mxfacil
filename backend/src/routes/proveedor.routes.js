const express  = require('express');
const router   = express.Router();
const provCtrl = require('../controllers/proveedor.controller');
const auth     = require('../middlewares/auth');
const isAdmin  = require('../middlewares/admin');

// Listar proveedores (público)
router.get('/',    provCtrl.listProveedores);

// Admin
router.post('/',      auth, isAdmin, provCtrl.createProveedor);
router.put('/:id',    auth, isAdmin, provCtrl.updateProveedor);
router.delete('/:id', auth, isAdmin, provCtrl.deleteProveedor);

// Verificación de empresa
router.patch('/:id/verificacion', auth, isAdmin, provCtrl.verificarProveedor);

module.exports = router;
