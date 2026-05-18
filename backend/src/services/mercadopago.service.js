const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

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
        success: `${frontendUrl}/pedidos?mp=success`,
        failure: `${frontendUrl}/pedidos?mp=failure`,
        pending: `${frontendUrl}/pedidos?mp=pending`,
      },
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
