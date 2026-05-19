-- Agrega estado 'esperando_pago' para pedidos con pago online pendiente de confirmar
ALTER TABLE pedido
  MODIFY COLUMN estado ENUM(
    'esperando_pago',
    'pendiente',
    'en_proceso',
    'enviado',
    'entregado',
    'cancelado'
  ) DEFAULT 'pendiente';
