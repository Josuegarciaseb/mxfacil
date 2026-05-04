const express = require('express');
const router = express.Router();
const catCtrl = require('../controllers/categoria.controller');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');

// Pública: listar categorías
router.get('/', catCtrl.listCategorias);

// Admin
router.post('/', auth, isAdmin, catCtrl.createCategoria);
router.put('/:id', auth, isAdmin, catCtrl.updateCategoria);
router.delete('/:id', auth, isAdmin, catCtrl.deleteCategoria);

module.exports = router;
