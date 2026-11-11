import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { featuredProducts } from '../utils/membresia';
import Membresia from '../pages/vendor/Membresia';
vi.mock('../utils/api', () => ({http: vi.fn()}));
vi.mock('@stripe/stripe-js', () => ({loadStripe: vi.fn(() => Promise.resolve(null))}));
import { http } from '../utils/api';
describe('Membresía Pro', () => {
  test('rota proveedores sin duplicarlos y excluye productos agotados o inactivos', () => {
    const entries = Array.from({length:6}, (_,i)=>({product:{id:i+1,proveedor_id:i+1,proveedor_pro:1,stock:10,activo:1}}));
    entries.push({...entries[0],product:{...entries[0].product,id:20}});
    entries.push({product:{id:21,proveedor_id:9,proveedor_pro:1,stock:0,activo:1}});
    entries.push({product:{id:22,proveedor_id:10,proveedor_pro:1,stock:10,activo:0}});
    expect(featuredProducts(entries,0).map(e=>e.product.proveedor_id)).toEqual([1,2,3,4]);
    expect(featuredProducts(entries,4).map(e=>e.product.proveedor_id)).toEqual([5,6,1,2]);
    expect(featuredProducts([],0)).toEqual([]);
  });
  test('muestra activación y fecha únicamente tras verificar el pago en servidor', async () => {
    const state={activo:false,vigente:false,vence_en:null,verificado:true,precio_centavos:19900,pago_disponible:true,compras:[],metricas:null};
    http.mockResolvedValueOnce(state).mockResolvedValueOnce({...state,activo:true,vigente:true,vence_en:'2030-01-01T12:00:00Z'});
    render(<Membresia token="test" />);
    expect(await screen.findByText('Plan gratuito')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Verificar mi pago'}));
    expect(await screen.findByText('Membresía activa')).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Comprar Pro por 30 días'})).not.toBeInTheDocument();
    expect(http).toHaveBeenLastCalledWith('/membresia/confirm',{method:'POST'},'test');
  });
});
