import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({confirm:vi.fn(),getElement:vi.fn(),http:vi.fn()}));
vi.mock('../utils/api',()=>({http:mocks.http}));
vi.mock('@stripe/stripe-js',()=>({loadStripe:vi.fn()}));
vi.mock('@stripe/react-stripe-js',()=>({
  Elements:({children})=>children,
  useStripe:()=>({confirmCardPayment:mocks.confirm}),
  useElements:()=>({getElement:mocks.getElement}),
  CardNumberElement:({onChange})=><input aria-label="Tarjeta" onChange={e=>onChange({complete:e.target.value==='completo'})} />,
  CardExpiryElement:({onChange})=><input aria-label="Vencimiento" onChange={e=>onChange({complete:e.target.value==='completo'})} />,
  CardCvcElement:({onChange})=><input aria-label="CVC" onChange={e=>onChange({complete:e.target.value==='completo'})} />,
}));
import { PaymentForm } from '../pages/vendor/Membresia';
beforeEach(()=>{vi.clearAllMocks();mocks.getElement.mockReturnValue({stripeElement:true});});
function complete(name){fireEvent.change(screen.getByLabelText(name),{target:{value:'completo'}});}
test('impide pagar con CVC incompleto y activa solo con confirmación del servidor',async()=>{
  const update=vi.fn();
  mocks.confirm.mockResolvedValue({paymentIntent:{status:'succeeded'}});
  mocks.http.mockResolvedValue({vigente:true,activo:true});
  render(<PaymentForm intent={{status:'requires_payment_method',client_secret:'secret',monto_centavos:19900}} token="token" onUpdate={update} onClose={()=>{}} />);
  const button=screen.getByRole('button',{name:'Pagar $199.00'});
  expect(button).toBeDisabled();complete('Tarjeta');complete('Vencimiento');
  expect(button).toBeDisabled();fireEvent.click(button);expect(mocks.confirm).not.toHaveBeenCalled();
  complete('CVC');expect(button).toBeEnabled();fireEvent.click(button);
  await waitFor(()=>expect(update).toHaveBeenCalledWith({vigente:true,activo:true}));
  expect(mocks.confirm).toHaveBeenCalledWith('secret',{payment_method:{card:{stripeElement:true}}});
  expect(mocks.http).toHaveBeenCalledWith('/membresia/confirm',{method:'POST'},'token');
});
test('muestra rechazo de Stripe y limpia el aviso cuando se corrige el CVC',async()=>{
  mocks.confirm.mockResolvedValue({error:{message:'Tu código de seguridad está incompleto.'}});
  render(<PaymentForm intent={{status:'requires_payment_method',client_secret:'secret',monto_centavos:19900}} onUpdate={()=>{}} onClose={()=>{}} />);
  complete('Tarjeta');complete('Vencimiento');complete('CVC');fireEvent.click(screen.getByRole('button',{name:'Pagar $199.00'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('código de seguridad');
  expect(mocks.http).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('CVC'),{target:{value:''}});
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Pagar $199.00'})).toBeDisabled();
});
