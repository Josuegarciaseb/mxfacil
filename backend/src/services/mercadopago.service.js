const { MercadoPagoConfig, Preference, Payment, MerchantOrder } = require('mercadopago');
const crypto = require('node:crypto');

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000 },
});

exports.createPreference = async ({ items, pedidoId, frontendUrl }) => {
  const preference = new Preference(client);

  const response = await preference.create({
    body: {
      items,
      back_urls: {
        success: `${frontendUrl}/pago-retorno?pedido_id=${pedidoId}`,
        failure: `${frontendUrl}/pago-retorno?pedido_id=${pedidoId}`,
        pending: `${frontendUrl}/pago-retorno?pedido_id=${pedidoId}`,
      },
      auto_return: "approved",
      external_reference: String(pedidoId),
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/pagos/mercadopago/webhook`,
    },
  });

  return response;
};

exports.getPayment = async (paymentId) => {
  const payment = new Payment(client);
  return await payment.get({ id: paymentId });
};

exports.getPreference = (id) => new Preference(client).get({preferenceId:id});
exports.getMerchantOrder = (id) => new MerchantOrder(client).get({merchantOrderId:id});

exports.verifyWebhook = (req) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return false; // fail closed until the integration has a signing secret
  const values = Object.fromEntries(String(req.headers['x-signature'] || '').split(',').map(p=>p.trim().split('=')));
  const id = req.query['data.id'];
  const requestId = req.headers['x-request-id'];
  if (typeof id !== 'string' || !requestId || !/^\d+$/.test(values.ts || '') || !/^[a-f0-9]{64}$/i.test(values.v1 || '')) return false;
  if (String(req.body.data?.id).toLowerCase() !== id.toLowerCase()) return false;
  const manifest = `id:${id.toLowerCase()};request-id:${requestId};ts:${values.ts};`;
  const expected = crypto.createHmac('sha256',secret).update(manifest).digest();
  return crypto.timingSafeEqual(expected,Buffer.from(values.v1,'hex'));
};
