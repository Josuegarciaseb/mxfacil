import { useId } from 'react';

const descriptions = ['Muy baja', 'Baja', 'Regular', 'Buena', 'Excelente'];

export default function StarRating({ label, value, onChange }) {
  const id = useId();
  return <fieldset className="review-rating" aria-describedby={`${id}-hint`}>
    <legend>{label}</legend>
    <div className="review-stars">
      {[1, 2, 3, 4, 5].map(number => <label className="review-star-choice" key={number}>
        <input type="radio" name={id} value={number} checked={Number(value) === number}
          required aria-label={`${number} ${number === 1 ? 'estrella' : 'estrellas'}`}
          onChange={() => onChange(number)} />
        <span aria-hidden="true" className={`review-star${number <= Number(value) ? ' review-star--selected' : ''}`}>
          {number <= Number(value) ? '★' : '☆'}
        </span>
      </label>)}
    </div>
    <p id={`${id}-hint`} className="review-rating-hint" aria-live="polite">
      {value ? `${value} de 5 — ${descriptions[Number(value) - 1]}` : 'Elige de 1 a 5 estrellas'}
    </p>
  </fieldset>;
}
