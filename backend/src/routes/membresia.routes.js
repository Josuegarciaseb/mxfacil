const router = require('express').Router();
const auth = require('../middlewares/auth');
const wrap = require('../utils/async-route');
const ctrl = require('../controllers/membresia.controller');
router.get('/me', auth, wrap(ctrl.get));
router.post('/intent', auth, wrap(ctrl.intent));
router.post('/confirm', auth, wrap(ctrl.confirm));
router.post('/eventos', wrap(ctrl.event));
module.exports = router;
