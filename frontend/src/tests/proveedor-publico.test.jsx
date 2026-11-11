import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { test, expect, vi, beforeEach } from 'vitest';
import ProveedorPublico from '../pages/client/ProveedorPublico';
import { http } from '../utils/api';
vi.mock('../utils/api',()=>({http:vi.fn()}));
const profile={proveedor:{id:1,nombre:'Huerta del Valle',proveedor_pro:1},resumen:{total:1,servicio:4,calidad:5},resenas:[{id:1,producto_nombre:'Mangos',servicio:4,calidad:5,comentario:'Excelente atención',creado_en:'2026-11-01T12:00:00Z'}],siguiente:null};
const product={id:1,proveedor_id:1,proveedor_nombre:'Huerta del Valle',nombre:'Mangos',precio:100,stock:10,categoria_id:1};
beforeEach(()=>{http.mockReset();http.mockImplementation(async path=>path.includes('/perfil')?profile:path==='/categorias'?[{id:1,nombre:'Frutas'}]:[product,{...product,id:2,proveedor_id:2,nombre:'Arroz ajeno'}]);});
function show(){const setCart=vi.fn();render(<MemoryRouter initialEntries={['/proveedores/1']}><Routes><Route path="/proveedores/:id" element={<ProveedorPublico cart={[]} setCart={setCart}/>} /></Routes></MemoryRouter>);return setCart;}
test('perfil Pro con estrellas, reseñas y únicamente sus productos comprables',async()=>{
  const setCart=show();
  expect(await screen.findByRole('heading',{name:'Huerta del Valle'})).toBeInTheDocument();
  expect(screen.getByText('Vendedor Pro')).toBeInTheDocument();
  expect(screen.getAllByRole('img',{name:'4.0 de 5 estrellas'})).toHaveLength(2);
  expect(screen.getByText('Excelente atención')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button',{name:'Agregar Mangos'}));
  expect(setCart.mock.calls[0][0]([])[0]).toMatchObject({id:1,qty:1});
  expect(screen.queryByText('Arroz ajeno')).not.toBeInTheDocument();
});
test('un vendedor normal sin reseñas conserva su catálogo',async()=>{
  http.mockImplementation(async path=>path.includes('/perfil')?{...profile,proveedor:{...profile.proveedor,proveedor_pro:0},resumen:{total:0},resenas:[]}:path==='/categorias'?[]:[product]);
  show();expect(await screen.findByText(/Este vendedor aún no tiene reseñas/)).toBeInTheDocument();
  expect(screen.queryByText('Vendedor Pro')).not.toBeInTheDocument();
  expect(await screen.findByRole('button',{name:'Agregar Mangos'})).toBeInTheDocument();
});
test('permite reintentar cuando falla la carga',async()=>{
  http.mockRejectedValueOnce(new Error('No se pudo cargar'));
  show();expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar');
  fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));
  expect(await screen.findByRole('heading',{name:'Huerta del Valle'})).toBeInTheDocument();
});
