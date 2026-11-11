import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import CotizacionCarrito from '../components/shipping/CotizacionCarrito';
import SeguimientoCastores from '../components/shipping/SeguimientoCastores';

it('identifica el flete de prueba y su vigencia antes de comprar', () => {
  const q = {id:5,flete:'80.00',servicio:'Carga consolidada',fuente:'sandbox',vigente:true,valida_hasta:'2026-12-01'};
  render(<MemoryRouter><CotizacionCarrito clave="demo" direccionId={1} cart={[]} cotizacion={q} setRespuesta={vi.fn()} /></MemoryRouter>);
  expect(screen.getByRole('status')).toHaveTextContent('Prueba de Envia.com');
  expect(screen.getByRole('status')).toHaveTextContent('$80.00 MXN');
  expect(screen.getByRole('status')).toHaveTextContent('2026-12-01');
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
