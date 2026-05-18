const https = require('https');

const BASE = process.env.PAYPAL_ENV === 'production'
  ? 'api-m.paypal.com'
  : 'api-m.sandbox.paypal.com';

function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');
  const payload = 'grant_type=client_credentials';

  const { body } = await httpsRequest({
    hostname: BASE,
    path: '/v1/oauth2/token',
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, payload);

  return body.access_token;
}

exports.createOrder = async (amount, pedidoId) => {
  const token = await getAccessToken();
  const payload = JSON.stringify({
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: `pedido_${pedidoId}`,
      amount: { currency_code: 'MXN', value: Number(amount).toFixed(2) },
    }],
  });

  const { body } = await httpsRequest({
    hostname: BASE,
    path: '/v2/checkout/orders',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, payload);

  return body;
};

exports.captureOrder = async (paypalOrderId) => {
  const token = await getAccessToken();

  const { body } = await httpsRequest({
    hostname: BASE,
    path: `/v2/checkout/orders/${paypalOrderId}/capture`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': '0',
    },
  });

  return body;
};
