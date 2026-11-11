const { MercadoPagoConfig, Preference, Payment, MerchantOrder } = require('mercadopago');
const crypto = require('node:crypto');

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000 },
});

exports.createPreference = async ({ items, pedidoId, frontendUrl, venceEpoch }) => {
  const preference = new Preference(client);

  const response = await preference.create({
    body: {
      items,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(venceEpoch * 1000).toISOString(),
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

exports.expirePreference = async (id, orderId) => {
  const preference = await exports.getPreference(id);
  if (preference.id !== id || String(preference.external_reference) !== String(orderId)) {
    throw Object.assign(new Error('La preferencia no corresponde al pedido'), { status: 409 });
  }
  if (preference.expires && Date.parse(preference.expiration_date_to) <= Date.now()) return preference;
  const now = Date.now();
  return new Preference(client).update({ id, updatePreferenceRequest: {
    expires: true,
    expiration_date_from: new Date(now - 60000).toISOString(),
    expiration_date_to: new Date(now - 1000).toISOString(),
  } });
};

exports.findMerchantOrders = async preferenceId => {
  const orders = [];
  const api = new MerchantOrder(client);
  let offset = 0;
  while (true) {
    const page = await api.search({ options: { preference_id: preferenceId, offset, limit: 50 } });
    if (!Array.isArray(page.elements) || !Number.isInteger(page.total) || page.total < 0) {
      throw Object.assign(new Error('Consulta incompleta de Mercado Pago'), { status: 502 });
    }
    orders.push(...page.elements);
    if (orders.length >= page.total) return orders;
    if (!page.elements.length || page.next_offset <= offset || !Number.isInteger(page.next_offset)) {
      throw Object.assign(new Error('Paginación incompleta de Mercado Pago'), { status: 502 });
    }
    offset = page.next_offset;
  }
};

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
