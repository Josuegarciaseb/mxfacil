import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import EstimadoDomicilio from '../components/shipping/EstimadoDomicilio';
import SeguimientoCastores from '../components/shipping/SeguimientoCastores';
import CartModal from '../pages/client/CartModal';
import { http } from '../utils/api';

vi.mock('../utils/api', () => ({http:vi.fn()}));

it.each(['FedEx','DHL'])('el vendedor propone %s para perecederos y el cliente tiene el rastreador correspondiente', async empresa => {
  const actualizar = vi.fn();
  const pedido = {id:17,domicilio_id:2,estado:'en_proceso',perecedero:1,revision_flete:0};
  http.mockResolvedValueOnce({guardado:true});
  const {rerender} = render(<SeguimientoCastores detalle={{pedido}} actualizar={actualizar} operador />);
  fireEvent.click(screen.getByRole('button',{name:'Registrar flete final'}));
  const opciones = screen.getByLabelText('Paquetería');
  expect(within(opciones).queryByRole('option',{name:'Castores'})).not.toBeInTheDocument();
  fireEvent.change(opciones,{target:{value:empresa}});
  fireEvent.change(screen.getByLabelText('Referencia de '+empresa),{target:{value:'TEST'}});
  fireEvent.change(screen.getByLabelText(/Flete final al destinatario/),{target:{value:'60'}});
  fireEvent.change(screen.getByLabelText('Servicio y plazo de entrega'),{target:{value:'Servicio de prueba, 24 h'}});
  fireEvent.click(screen.getByRole('checkbox',{name:/acepta estos perecederos/}));
  fireEvent.click(screen.getByRole('button',{name:'Guardar flete'}));
  await waitFor(()=>expect(actualizar).toHaveBeenCalled());
  expect(JSON.parse(http.mock.lastCall[1].body)).toMatchObject({transportista:empresa,cobertura_confirmada:true,revision:0,importe:'60'});
  rerender(<SeguimientoCastores detalle={{pedido:{...pedido,estado:'enviado',paqueteria:empresa,importe_destino:'60'},
    envio:{transportista:empresa,guia:'123456789012',fecha_envio:'2026-11-11',estado:'en_transito'}}} />);
  expect(screen.getByRole('link',{name:'rastreador oficial de '+empresa})).toHaveAttribute('href',
    empresa === 'FedEx' ? 'https://www.fedex.com/es-mx/tracking.html' : 'https://www.dhl.com/mx-es/home/rastreo.html');
  expect(screen.getByRole('button',{name:'Confirmar recepción'})).toBeEnabled();
  http.mockReset();
});

it('conserva las pasarelas habilitadas al elegir domicilio y confirma la compra sin pedir cotización', async () => {
  vi.stubEnv('VITE_STRIPE_PUBLIC_KEY','pk_test_fixture');
  vi.stubEnv('VITE_PAYPAL_CLIENT_ID','sandbox-fixture');
  const verPedido = vi.fn();
  const carrito = [{ id:4, nombre:'Semillas', precio:357, stock:4, qty:1, proveedor_id:1 }];
  http.mockImplementation(async path => {
    if (path === '/direcciones') return [{id:1,linea1:'Calle Prueba',ciudad:'Puebla'}];
    if (path === '/pagos/metodos') return ['tarjeta','paypal','transferencia','contra_entrega'];
    if (path === '/piloto/inicio-compra') return {inicio_checkout:'inicio-prueba'};
    if (path === '/envios/domicilio/estimado') return {estimado:247,fuente:'referencia'};
    if (path === '/pedidos') return {pedido:{id:7,estado:'pendiente'},pago:{estado:'pendiente'}};
    throw new Error('Ruta inesperada ' + path);
  });
  try {
    render(<CartModal open cart={carrito} token="prueba" userId={1} setCart={vi.fn()} onClose={vi.fn()} onOrdered={verPedido} />);
    const pago = screen.getByLabelText('Método de pago');
    await waitFor(()=>expect(within(pago).getByRole('option',{name:/Stripe/})).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Forma de entrega'),{target:{value:'domicilio'}});
    expect(await screen.findByText(/Envío estimado/)).toHaveTextContent('$247.00');
    expect(within(pago).getByRole('option',{name:'PayPal'})).toBeEnabled();
    expect(within(pago).getByRole('option',{name:/Mercado Pago/})).toBeDisabled();
    expect(within(pago).getByRole('option',{name:/contra entrega/})).toBeDisabled();
    fireEvent.change(pago,{target:{value:'transferencia'}});
    fireEvent.click(screen.getByRole('button',{name:'Confirmar pedido'}));
    await waitFor(()=>expect(verPedido).toHaveBeenCalledWith(7));
    const [,options] = http.mock.calls.find(([path])=>path === '/pedidos');
    expect(JSON.parse(options.body)).toMatchObject({entrega:'domicilio',metodo_pago:'transferencia',total_esperado:414.12,flete_autorizado:247});
    expect(http.mock.calls.some(([path])=>path.includes('/cotizaciones'))).toBe(false);
  } finally {
    vi.unstubAllEnvs();
    http.mockReset();
  }
});

it('muestra el estimado por separado y permite comprar sin cotizar', () => {
  const {rerender} = render(<EstimadoDomicilio tieneDireccion datos={{estimado:247,fuente:'referencia'}} />);
  expect(screen.getByText(/Envío estimado/)).toHaveTextContent('$247.00 MXN');
  expect(screen.getByText(/Hoy pagas la mercancía/)).toHaveTextContent('a la paquetería al recibir');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  rerender(<EstimadoDomicilio tieneDireccion datos={{estimado:null,fuente:null}} />);
  expect(screen.getByText(/El vendedor confirmará/)).toBeInTheDocument();
  expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
});

it('el comprador puede confirmar la recepción y el vendedor consulta la guía', () => {
  const detalle = {pedido:{id:1,estado:'enviado',flete:'80.00'},envio:{guia:'ABC-12345',estado:'en_transito',fecha_envio:'2026-11-11T12:00:00Z'}};
  const { rerender } = render(<SeguimientoCastores detalle={detalle} operador />);
  expect(screen.queryByRole('button',{name:'Confirmar recepción'})).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:/rastreador oficial/})).toHaveAttribute('href','https://www.castores.com.mx/');
  rerender(<SeguimientoCastores detalle={detalle} />);
  expect(screen.getByRole('button',{name:'Confirmar recepción'})).toBeEnabled();
  expect(screen.getByText('ABC-12345')).toBeInTheDocument();
});

it('la falta de guía aparece como preparación y no como tránsito', () => {
  const detalle = {pedido:{id:1,estado:'en_proceso',flete:'80.00'},envio:{estado:'preparando'},pago:{estado:'aprobado'}};
  render(<SeguimientoCastores detalle={detalle} operador />);
  expect(screen.getByText(/La guía aparecerá al despachar/)).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Registrar despacho'})).toBeEnabled();
  expect(screen.queryByRole('link',{name:/rastreador oficial/})).not.toBeInTheDocument();
});
