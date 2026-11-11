import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import Piloto from '../pages/admin/Piloto';
import { http } from '../utils/api';

vi.mock('../utils/api', () => ({ http: vi.fn() }));

test('un costo desconocido puede registrarse como cero y el informe vuelve a calcularse', async () => {
  let costo = null;
  http.mockImplementation(async (path, options) => {
    if (options.method === 'PATCH') {
      const data = JSON.parse(options.body);
      expect(data).toEqual({ costo_variable: '0', anterior: null });
      costo = '0.00';
      return { guardado: true };
    }
    return {
      resumen: { tiendas_compradoras: 1, tiendas_recurrentes: 0, entregados: 1, cancelados: 0, pendientes: 0,
        comision_obtenida: '7.00', muestras_tiempo: 0, segundos_promedio: null },
      pedidos: [{ id: 12, tienda: 'Tienda Centro', usuario_id: 8, estado: 'entregado', pago_estado: 'aprobado',
        comision_obtenida: '7.00', costo_variable: costo, margen: costo === null ? null : '7.00', checkout_segundos: null }],
    };
  });
  render(<Piloto token="prueba" usuarios={[{ id: 8, rol: 'cliente', nombre: 'Tienda Centro' }]}
    proveedores={[{ id: 9, nombre: 'Cooperativa de prueba' }]} />);
  const fila = await screen.findByRole('row', { name: /Tienda Centro/ });
  expect(within(fila).getByText('Sin determinar')).toBeVisible();
  fireEvent.change(within(fila).getByLabelText('Costo variable del pedido 12'), { target: { value: '0' } });
  fireEvent.click(within(fila).getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(screen.queryByText('Sin determinar')).toBeNull());
  expect(await screen.findByDisplayValue('0.00')).toBeVisible();
  expect(http).toHaveBeenCalledWith('/piloto/pedidos/12/costo', expect.objectContaining({ method: 'PATCH' }), 'prueba');
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2020-02-01' } });
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2020-02-14' } });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar informe' }));
  await waitFor(() => expect(http).toHaveBeenCalledWith('/piloto?desde=2020-02-01&hasta=2020-02-14', {}, 'prueba'));
  fireEvent.click(screen.getByText('Proveedores del piloto (todos)'));
  const proveedores = screen.getByLabelText(/Proveedores participantes/);
  proveedores.options[0].selected = true;
  fireEvent.change(proveedores);
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar informe' }));
  await waitFor(() => expect(http).toHaveBeenCalledWith('/piloto?desde=2020-02-01&hasta=2020-02-14&proveedores=9', {}, 'prueba'));
  fireEvent.click(screen.getByRole('button', { name: 'Todos los proveedores' }));
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar informe' }));
  await waitFor(() => expect(http.mock.lastCall[0]).toBe('/piloto?desde=2020-02-01&hasta=2020-02-14'));
});
