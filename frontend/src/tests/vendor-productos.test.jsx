import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import VendedorProductos from '../pages/vendor/Productos';
import { http } from '../utils/api';
import { toast } from '../utils/toast';

vi.mock('../utils/api', () => ({ http: vi.fn(), httpUpload: vi.fn() }));
vi.mock('../utils/toast', () => ({ toast: vi.fn() }));

let product;
beforeEach(() => {
  vi.clearAllMocks();
  product = { id: 1, nombre: 'Caja de mangos', categoria_id: 1, categoria_nombre: 'Frutas y verduras',
    precio: 100, stock: 5, presentacion: 'Caja de 5 kg', activo: 1 };
  http.mockImplementation(async (path, options = {}) => {
    if (path === '/categorias') return [{ id: 1, nombre: 'Frutas y verduras' }];
    if (options.method === 'PUT') {
      const { stock_agregar = 0, ...changes } = JSON.parse(options.body);
      product = { ...product, ...changes, stock: product.stock + stock_agregar };
      return product;
    }
    return [product];
  });
});

async function editProduct() {
  render(<VendedorProductos token="vendor-token" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Editar Caja de mangos' }));
  return screen.getByRole('dialog', { name: 'Editar Producto' });
}

test('muestra el stock actual, envía la reposición y actualiza la tabla; al reabrir limpia la cantidad', async () => {
  const dialog = await editProduct();
  const quantity = within(dialog).getByRole('spinbutton', { name: 'Stock a agregar' });
  expect(quantity).toHaveAccessibleDescription(/Stock actual: 5 \(Caja de 5 kg\)/);
  fireEvent.change(quantity, { target: { value: '7' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(http).toHaveBeenCalledWith('/productos/1', expect.objectContaining({
    method: 'PUT', body: expect.stringContaining('"stock_agregar":7'),
  }), 'vendor-token');
  expect(await screen.findByText('12')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Editar Caja de mangos' }));
  expect(screen.getByRole('spinbutton', { name: 'Stock a agregar' })).toHaveValue(null);
});

test('guardar con el campo vacío permite editar sin cambiar el stock', async () => {
  const dialog = await editProduct();
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nombre' }), { target: { value: 'Mangos frescos' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
  await screen.findByText('Mangos frescos');
  const update = http.mock.calls.find(([, options]) => options?.method === 'PUT');
  expect(JSON.parse(update[1].body)).not.toHaveProperty('stock_agregar');
  expect(product.stock).toBe(5);
});

test('rechaza cantidades negativas, decimales, cero o fuera del límite antes de guardar', async () => {
  const dialog = await editProduct();
  for (const value of ['-1', '1.5', '0', '2147483648']) {
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Stock a agregar' }), { target: { value } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(toast).toHaveBeenLastCalledWith('El stock a agregar debe ser un entero mayor a 0', 'error');
  }
  expect(http.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  expect(dialog).toBeInTheDocument();
});

test('un error al guardar conserva la cantidad para corregir la edición', async () => {
  const dialog = await editProduct();
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Stock a agregar' }), { target: { value: '2' } });
  http.mockRejectedValueOnce(new Error('No se pudo actualizar'));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
  expect(toast).toHaveBeenCalledWith('No se pudo actualizar', 'error');
  expect(within(dialog).getByRole('spinbutton', { name: 'Stock a agregar' })).toHaveValue(2);
});

test('crear mantiene el stock inicial y no envía una reposición', async () => {
  render(<VendedorProductos token="vendor-token" />);
  await screen.findByText('Caja de mangos');
  await userEvent.click(screen.getByRole('button', { name: 'Nuevo' }));
  const dialog = screen.getByRole('dialog', { name: 'Nuevo Producto' });
  expect(within(dialog).queryByRole('spinbutton', { name: 'Stock a agregar' })).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nombre' }), { target: { value: 'Arroz' } });
  await userEvent.selectOptions(within(dialog).getByLabelText('Categoria'), '1');
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Precio (MXN)' }), { target: { value: '50' } });
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Stock inicial' }), { target: { value: '10' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
  const create = http.mock.calls.find(([, options]) => options?.method === 'POST');
  expect(JSON.parse(create[1].body)).toMatchObject({ stock_inicial: 10 });
  expect(JSON.parse(create[1].body)).not.toHaveProperty('stock_agregar');
});
