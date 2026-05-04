const express = require('express');
const router = express.Router();
const usuarioCtrl = require('../controllers/usuario.controller');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');

// Usuario actual
router.get('/me', auth, usuarioCtrl.getMe);
router.put('/me', auth, usuarioCtrl.updateMe);

// Admin
router.get('/', auth, isAdmin, usuarioCtrl.listUsuarios);
router.put('/:id', auth, isAdmin, usuarioCtrl.updateUsuarioAdmin); 
router.delete('/:id', auth, isAdmin, usuarioCtrl.deleteUsuario);

module.exports = router;