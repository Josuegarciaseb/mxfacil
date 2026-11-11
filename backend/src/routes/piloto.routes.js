const router = require('express').Router();
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');
const wrap = require('../utils/async-route');
const piloto = require('../controllers/piloto.controller');

router.use(auth);
router.post('/inicio-compra', piloto.inicioCompra);
router.get('/', admin, wrap(piloto.informe));
router.patch('/pedidos/:id/costo', admin, wrap(piloto.guardarCosto));

module.exports = router;
