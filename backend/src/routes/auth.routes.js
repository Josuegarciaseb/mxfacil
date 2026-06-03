const express  = require('express');
const router   = express.Router();
const authCtrl = require('../controllers/auth.controller');
const auth     = require('../middlewares/auth');

// Autenticación básica
router.post('/register', authCtrl.register);
router.post('/login',    authCtrl.login);
router.post('/logout',   authCtrl.logout);

// Intercambio seguro de cookie OAuth → token JSON (sin token en URL)
router.get('/session',   authCtrl.session);

// MFA — requiere estar autenticado para configurar
router.get ('/mfa/status',  auth, authCtrl.getMfaStatus);
router.post('/mfa/setup',   auth, authCtrl.setupMfa);
router.post('/mfa/verify',  auth, authCtrl.verifyMfa);
router.post('/mfa/disable', auth, authCtrl.disableMfa);

// Verificación de firma digital
router.post('/verify-signature', authCtrl.verifyDataSignature);

module.exports = router;
