-- Ampliar ENUM de metodo en pago para soportar PayPal y MercadoPago
ALTER TABLE pago
  MODIFY COLUMN metodo ENUM(
    'tarjeta',
    'paypal',
    'mercadopago',
    'transferencia',
    'contra_entrega',
    'plataforma'
  ) NOT NULL;
