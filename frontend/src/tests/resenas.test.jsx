import {beforeEach,expect,test,vi} from 'vitest';
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import OrderReviews from '../components/reviews/OrderReviews';
import ProductReviews from '../components/reviews/ProductReviews';
import {http} from '../utils/api';
vi.mock('../utils/api',()=>({http:vi.fn()}));
const detail={pedido:{id:7,estado:'entregado'},pago:{estado:'aprobado'},items:[{id:21,producto_nombre:'Arroz',proveedor_nombre:'Proveedor normal'}]};
beforeEach(()=>vi.resetAllMocks());
test('confirma la recepción únicamente tras la confirmación explícita del cliente',async()=>{
  http.mockResolvedValue({estado:'entregado'});const done=vi.fn();
  render(<OrderReviews detalle={detail} token="token" onDelivered={done}/>);
  fireEvent.click(screen.getByRole('button',{name:'Confirmar recibido'}));
  expect(http).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Sí, recibí todo'}));
  await waitFor(()=>expect(done).toHaveBeenCalledOnce());
  expect(http).toHaveBeenCalledWith('/pedidos/7/entregado',{method:'POST'},'token');
});
test('no permite confirmar pedidos sin pagar o cancelados',()=>{
  const {rerender}=render(<OrderReviews detalle={{...detail,pago:{estado:'pendiente'}}}/>);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  rerender(<OrderReviews detalle={{...detail,pedido:{id:7,estado:'cancelado'}}}/>);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  for(const estado of ['pendiente','en_proceso','enviado']) {
    rerender(<OrderReviews detalle={{...detail,pedido:{id:7,estado}}}/>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  }
});
test('publica las dos calificaciones y conserva la reseña al volver a abrir',async()=>{
  http.mockResolvedValueOnce([]).mockResolvedValueOnce({id:1});
  const delivered={...detail,pedido:{id:7,estado:'entregado',recibido_cliente_en:'2026-11-11T12:00:00Z'}};
  const {unmount}=render(<OrderReviews detalle={delivered} token="token"/>);
  const form=await screen.findByRole('form',{name:'Reseñar Arroz'});
  fireEvent.click(within(within(form).getByRole('group',{name:'Calidad del producto'})).getByRole('radio',{name:'5 estrellas'}));
  fireEvent.click(within(within(form).getByRole('group',{name:'Servicio del proveedor'})).getByRole('radio',{name:'4 estrellas'}));
  fireEvent.change(within(form).getByLabelText('Tu experiencia (opcional)'),{target:{value:'Muy buen arroz'}});
  fireEvent.click(within(form).getByRole('button',{name:'Publicar reseña'}));
  expect(await screen.findByText('Compra verificada · Reseña publicada')).toBeInTheDocument();
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
  expect(JSON.parse(http.mock.calls[1][1].body)).toEqual({pedido_item_id:21,calidad:5,servicio:4,comentario:'Muy buen arroz'});
  unmount();http.mockResolvedValueOnce([{id:1,pedido_item_id:21,calidad:5,servicio:4,comentario:'Muy buen arroz'}]);
  render(<OrderReviews detalle={delivered} token="token"/>);
  expect(await screen.findByText('Muy buen arroz')).toBeInTheDocument();
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
});
test('las opiniones públicas muestran comentarios como texto y permiten paginar',async()=>{
  const row={id:12,calidad:4,servicio:5,comentario:'<script>alert(1)</script>',creado_en:'2026-11-11T12:00:00Z'};
  http.mockResolvedValueOnce({resumen:{total:11,calidad:4,servicio:5},resenas:[row],siguiente:12})
    .mockResolvedValueOnce({resumen:{total:11,calidad:4,servicio:5},resenas:[{...row,id:1,comentario:'Buen servicio'}],siguiente:null});
  render(<ProductReviews product={{id:2,nombre:'Arroz'}} onClose={()=>{}}/>);
  expect(await screen.findByText('<script>alert(1)</script>')).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Ver más reseñas'}));
  expect(await screen.findByText('Buen servicio')).toBeInTheDocument();
  expect(http).toHaveBeenLastCalledWith('/productos/2/resenas?antes=12');
});
