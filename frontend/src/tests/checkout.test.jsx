import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { cartKey, cartTotals, gross, mergeCart, publicPrice, readCart, refreshCart } from '../utils/cart';
import PaymentReturn from '../pages/PaymentReturn';
import { http } from '../utils/api';

vi.mock('../utils/api', () => ({http:vi.fn()}));
afterEach(() => {localStorage.clear();vi.clearAllMocks();});

describe('Carrito y regreso de una pasarela', () => {
  it('redondea a centavos los precios y calcula el IVA sobre el subtotal del pedido', () => {
    const price = publicPrice(0.29);
    expect(price).toBe(0.30);
    expect(gross(price)).toBe(0.35);
    const totals = cartTotals([{id:1,precio:price,qty:2},{id:2,precio:publicPrice(100),qty:1}]);
    expect(totals.subtotal).toBe(102.60);
    expect(totals.iva).toBe(16.42);
    expect(totals.total).toBe(119.02);
    expect(totals.lines).toEqual({1:0.7,2:118.32});
  });
  it('recupera cantidades por cliente, aplica stock actual y retira artículos desactivados', () => {
    const cart = [{id:1,qty:4,stock:5,precio:102},{id:2,qty:1,stock:3,precio:1}];
    localStorage.setItem(cartKey({id:9}),JSON.stringify(cart));
    expect(readCart({id:10})).toEqual([]);
    expect(readCart(null)).toEqual([]);
    const merged = mergeCart(readCart({id:9}),[{id:1,qty:2,stock:5,precio:102}]);
    expect(merged[0].qty).toBe(5);
    expect(refreshCart(merged,[{id:1,stock:2,precio:50}])).toEqual([{id:1,stock:2,precio:51,qty:2}]);
  });
  it.each([['pendiente','Pago pendiente de confirmación'],['aprobado','Pago confirmado']])(
    'muestra el estado %s consultado al servidor aunque la URL anuncie éxito', async (estado,title) => {
      localStorage.setItem('token','fixture');
      http.mockResolvedValue({estado});
      render(<MemoryRouter initialEntries={['/pago-retorno?pedido_id=42&status=approved']}><PaymentReturn/></MemoryRouter>);
      expect(await screen.findByRole('heading',{name:title})).toBeInTheDocument();
      expect(http).toHaveBeenCalledWith('/pagos/pedido/42');
      expect(screen.getByRole('link')).toHaveAttribute('href','/mis-pedidos?pedido_id=42');
    });
});
