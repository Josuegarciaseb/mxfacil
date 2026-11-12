const fechaLarga = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' });
export function fechaPedido(valor) {
  const fecha = valor && new Date(valor);
  return fecha && !Number.isNaN(fecha.getTime()) ? fechaLarga.format(fecha) : '';
}
export const unidades = cantidad => Number(cantidad) === 1 ? '1 unidad' : cantidad + ' unidades';

const estados = {
  esperando_pago: { etiqueta: 'Esperando pago', titulo: 'Tu compra está pendiente de pago', paso: 0, tono: 'pendiente' },
  pendiente:      { etiqueta: 'Pedido recibido', titulo: 'Recibimos tu pedido', paso: 0 },
  en_proceso:     { etiqueta: 'En preparación', titulo: 'Estamos preparando tu compra', paso: 1 },
  enviado:        { etiqueta: 'En camino', titulo: 'Tu compra ya está en camino', paso: 2 },
  entregado:      { etiqueta: 'Entregado', titulo: 'Tu compra fue entregada', paso: 3 },
  cancelado:      { etiqueta: 'Cancelado', titulo: 'Tu pedido fue cancelado', paso: null, tono: 'cancelado' },
};

export function estadoPedido(pedido, estadoEnvio = pedido.envio_estado) {
  const estado = estados[pedido.estado] || { etiqueta: 'Pedido', titulo: 'Detalle de tu pedido', paso: null };
  if (estadoEnvio === 'incidencia' && !['cancelado', 'entregado'].includes(pedido.estado)) {
    return { ...estado, etiqueta: 'Incidencia', titulo: 'Hay una incidencia con tu envío', tono: 'pendiente' };
  }
  return estado;
}
