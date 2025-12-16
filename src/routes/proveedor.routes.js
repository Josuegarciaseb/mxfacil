const express = require('express');
const router = express.Router();
const provCtrl = require('../controllers/proveedor.controller');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');

// Listar proveedores (público o protegido, como prefieras)
// aquí lo dejo público para que el frontend pueda mostrar info básica
router.get('/', provCtrl.listProveedores);

// Admin
router.post('/', auth, isAdmin, provCtrl.createProveedor);
router.put('/:id', auth, isAdmin, provCtrl.updateProveedor);
router.delete('/:id', auth, isAdmin, provCtrl.deleteProveedor);

module.exports = router;
