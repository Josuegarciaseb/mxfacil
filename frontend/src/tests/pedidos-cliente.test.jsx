import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ClientPedidos from '../pages/client/Pedidos';
import { http } from '../utils/api';

vi.mock('../utils/api', () => ({ http: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

const compra = {
  pedido: { id: 24, fecha: '2026-11-10T12:00:00Z', estado: 'enviado', subtotal: '300.00', iva: '48.00',
    total: '368.00', cotizacion_castores_id: 5, flete: '20.00', direccion_linea1: 'Calle del Campo 12' },
  items: [{ id: 7, producto_nombre: 'Mangos', cantidad: 2, precio_unitario: '150.00' }],
  pago: { metodo: 'transferencia', estado: 'aprobado', monto: '368.00' },
  envio: { estado: 'en_transito', guia: 'ABC-12345', transportista: 'Castores', fecha_envio: '2026-11-11T12:00:00Z' },
};

function abrir(ruta, onResume = vi.fn()) {
  return render(<MemoryRouter initialEntries={[ruta]}><Routes>
    <Route path="/mis-pedidos" element={<ClientPedidos token="prueba" onResume={onResume} />} />
  </Routes></MemoryRouter>);
}

it('abre una compra desde el historial, permite consultar su guía y regresa al listado', async () => {
  http.mockImplementation(async ruta => ruta === '/pedidos'
    ? [{ ...compra.pedido, producto_nombre: 'Mangos', productos_distintos: 1 }] : compra);
  abrir('/mis-pedidos');
  fireEvent.click(await screen.findByRole('link', { name: 'Ver pedido #24' }));
  expect(await screen.findByRole('heading', { name: 'Tu compra ya está en camino' })).toBeInTheDocument();
  const resumen = screen.getByRole('complementary', { name: 'Detalle de la operación' });
  expect(within(resumen).getByText('Total pagado').parentElement).toHaveTextContent('$368.00');
  expect(within(resumen).getByText('Flete incluido').parentElement).toHaveTextContent('$20.00');
  fireEvent.click(screen.getByRole('button', { name: 'Detalle del envío' }));
  const rastreo = screen.getByRole('region', { name: 'Seguimiento con Castores' });
  expect(within(rastreo).getByText('ABC-12345')).toBeVisible();
  expect(within(rastreo).getByRole('button', { name: 'Confirmar recepción' })).toBeEnabled();
  fireEvent.click(screen.getByRole('link', { name: 'Mis pedidos', exact: true }));
  expect(await screen.findByRole('link', { name: 'Ver pedido #24' })).toBeVisible();
});

it('permite retomar el pago de un enlace directo y actualiza el seguimiento al cancelar', async () => {
  const pendiente = { ...compra, pedido: { ...compra.pedido, estado: 'esperando_pago', reserva_vence_epoch: 1794564000 },
    envio: null, pago: { estado: 'pendiente', metodo: 'tarjeta', monto: '368.00' } };
  const cancelado = { ...pendiente, pedido: { ...pendiente.pedido, estado: 'cancelado' }, pago: { ...pendiente.pago, estado: 'rechazado' } };
  http.mockResolvedValueOnce(pendiente).mockResolvedValueOnce(cancelado).mockResolvedValueOnce(cancelado);
  const continuar = vi.fn();
  abrir('/mis-pedidos?pedido_id=24', continuar);
  fireEvent.click(await screen.findByRole('button', { name: 'Continuar pago' }));
  expect(continuar).toHaveBeenCalledWith({ pedidoId: 24, metodo: 'tarjeta', monto: '368.00' });
  expect(http).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Total pagado')).not.toBeInTheDocument();
  const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    expect(await screen.findByRole('heading', { name: 'Tu pedido fue cancelado' })).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Progreso del pedido' })).not.toBeInTheDocument();
    expect(http).toHaveBeenCalledWith('/pedidos/24/cancelar', { method: 'POST' }, 'prueba');
  } finally { confirmar.mockRestore(); }
});

it('mantiene el flete por cobrar fuera del total y permite autorizarlo desde el seguimiento', async () => {
  const pedido = { ...compra.pedido, estado: 'en_proceso', domicilio_id: 5, total: '348.00', importe_destino: '70.00',
    autorizado_hasta: '50.00', revision_flete: 2, paqueteria: 'FedEx' };
  let autorizado = false;
  http.mockImplementation(async (ruta, opciones) => {
    if (ruta === '/envios/domicilio/pedidos/24/aceptar') {
      expect(JSON.parse(opciones.body)).toEqual({ importe: '70.00', revision: 2 });
      autorizado = true;
    }
    return { ...compra, pedido: { ...pedido, autorizado_hasta: autorizado ? '70.00' : '50.00' }, envio: { estado: 'preparando' } };
  });
  abrir('/mis-pedidos?pedido_id=24');
  const aceptar = await screen.findByRole('button', { name: 'Autorizar flete de $70.00 MXN' });
  const resumen = screen.getByRole('complementary');
  expect(within(resumen).getByText('Flete al recibir').parentElement).toHaveTextContent('$70.00');
  expect(within(resumen).getByText('Total de mercancía con IVA').parentElement).toHaveTextContent('$348.00');
  expect(within(resumen).queryByText('Flete incluido')).not.toBeInTheDocument();
  fireEvent.click(aceptar);
  expect(await screen.findByText('Importe autorizado por el comprador.')).toBeVisible();
});
