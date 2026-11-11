import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import StarRating from '../components/reviews/StarRating';

function Example({disabled=false}) {
  const [value,setValue]=useState('');
  return <fieldset disabled={disabled}><StarRating label="Servicio del proveedor" value={value} onChange={setValue}/></fieldset>;
}
test('ilumina hasta la estrella elegida y permite bajar la calificación',async()=>{
  const user=userEvent.setup();const {container}=render(<Example/>);
  expect(screen.getByText('Elige de 1 a 5 estrellas')).toBeInTheDocument();
  await user.click(screen.getByRole('radio',{name:'4 estrellas'}));
  expect(container.querySelectorAll('.review-star--selected')).toHaveLength(4);
  expect(screen.getByRole('radio',{name:'4 estrellas'})).toBeChecked();
  expect(screen.getByText('4 de 5 — Buena')).toBeInTheDocument();
  await user.click(screen.getByRole('radio',{name:'2 estrellas'}));
  expect(container.querySelectorAll('.review-star--selected')).toHaveLength(2);
  expect(screen.getByRole('radio',{name:'4 estrellas'})).not.toBeChecked();
});
test('permite seleccionar con flechas y bloquea cambios mientras se publica',async()=>{
  const user=userEvent.setup();const {rerender}=render(<Example/>);
  await user.click(screen.getByRole('radio',{name:'2 estrellas'}));
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio',{name:'3 estrellas'})).toBeChecked();
  rerender(<Example disabled/>);
  expect(screen.getByRole('radio',{name:'5 estrellas'})).toBeDisabled();
  await user.click(screen.getByRole('radio',{name:'5 estrellas'}));
  expect(screen.getByRole('radio',{name:'3 estrellas'})).toBeChecked();
});
