const { transaction, fail } = require('./order-state.service');
const stripe = require('./stripe.service');

function price() {
  const value = Number(process.env.PRO_PRICE_CENTS || 19900);
  if (!Number.isSafeInteger(value) || value < 1000 || value > 1000000) fail(503, 'Precio Pro sin configurar correctamente');
  return value;
}
function testPaymentsEnabled() { return /^sk_test_/.test(process.env.STRIPE_SECRET_KEY || ''); }
function validatePayment(intent, purchase) {
  if (intent.livemode !== false || intent.status !== 'succeeded' ||
      intent.id !== purchase.referencia || intent.currency !== 'mxn' ||
      intent.amount_received !== purchase.monto_centavos ||
      intent.metadata?.membresia_compra_id !== purchase.id ||
      intent.metadata?.proveedor_id !== String(purchase.proveedor_id)) {
    fail(409, 'El pago de prueba no está confirmado o no corresponde a esta membresía');
  }
}
async function approve(intent) {
  const id = intent.metadata?.membresia_compra_id;
  if (!id) fail(400, 'Referencia de membresía inválida');
  return transaction(async conn => {
    // All purchase and confirmation paths lock the provider before the purchase.
    const [found] = await conn.query('SELECT proveedor_id FROM membresia_compra WHERE id=?', [id]);
    if (!found.length) fail(503, 'Compra aún no registrada; reintentar confirmación');
    await conn.query('SELECT id FROM proveedor WHERE id=? FOR UPDATE', [found[0].proveedor_id]);
    const [[purchase]] = await conn.query('SELECT * FROM membresia_compra WHERE id=? FOR UPDATE', [id]);
    validatePayment(intent, purchase);
    if (purchase.estado === 'aprobado') return;
    await conn.query(`INSERT INTO membresia (proveedor_id,vence_en) VALUES (?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 DAY))
      ON DUPLICATE KEY UPDATE vence_en=DATE_ADD(GREATEST(vence_en,UTC_TIMESTAMP(3)),INTERVAL 30 DAY)`, [purchase.proveedor_id]);
    await conn.query(`UPDATE membresia_compra SET estado='aprobado', aprobado_en=UTC_TIMESTAMP(3),
      vence_en=(SELECT vence_en FROM membresia WHERE proveedor_id=?) WHERE id=?`, [purchase.proveedor_id, id]);
  });
}
async function reconcile(purchase) {
  if (!purchase?.referencia) return;
  const intent = await stripe.retrievePaymentIntent(purchase.referencia);
  if (intent.status === 'succeeded') await approve(intent);
}
module.exports = { price, testPaymentsEnabled, validatePayment, approve, reconcile };
