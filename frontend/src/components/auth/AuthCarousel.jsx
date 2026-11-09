import { useEffect, useState } from "react";
import Logo from "../ui/Logo";

const SLIDES = [
  {
    photo: "mazorca-marek-studzinski",
    alt: "Mazorca de granos dorados entre hojas abiertas",
    focus: "36%",
    title: <>Sin maíz <em>no hay país.</em></>,
    copy: "Encuentra maíz al mayoreo para tu molino, tu cocina o tu tienda.",
  },
  {
    photo: "mangos-jacqueline-brandwayn",
    alt: "Mangos de cáscara roja, amarilla y verde apilados",
    focus: "43%",
    title: "El mango se antoja.",
    copy: "Dale color a tu puesto. Busca mango por caja para tu próxima venta.",
  },
  {
    photo: "platanos-verdes-godwin-leones",
    alt: "Racimo de plátanos verdes que cuelga entre las hojas",
    focus: "43%",
    title: "Del racimo a tu puesto.",
    copy: "Compara precios y elige cuánto plátano llevar a tu frutería.",
  },
  {
    photo: "tallos-david-trinks",
    alt: "Detalle de varios tallos dorados con nudos oscuros",
    focus: "46%",
    title: "El campo surte tu negocio.",
    copy: "Crea tu cuenta y arma tu primer pedido al mayoreo.",
  },
  {
    photo: "papayas-wengang-zhai",
    alt: "Papayas verdes creciendo junto al tronco de un árbol",
    focus: "38%",
    title: "Del árbol al desayuno.",
    copy: "¿Fruta picada o licuado? Busca papaya para el menú de mañana.",
  },
  {
    photo: "milpa-benjamin-jopen",
    alt: "Surcos de maíz bajo un cielo nublado",
    focus: "36%",
    title: "Aquí empieza la tortilla.",
    copy: "Conoce a los proveedores de maíz y prepara tu próxima molienda.",
  },
  {
    photo: "platanos-ilona-frey",
    alt: "Plátanos amarillos unidos en un racimo",
    focus: "36%",
    title: "El sabor está en su punto.",
    copy: "Registra tu negocio y encuentra fruta para surtir la semana.",
  },
];

const INTERVAL_MS = 3000;

export default function AuthCarousel({ onBack }) {
  const [index, setIndex] = useState(0);
  const previous = (index - 1 + SLIDES.length) % SLIDES.length;
  const next = (index + 1) % SLIDES.length;
  const active = SLIDES[index];
  const brand = <Logo size={48} textColor="#fff" />;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="auth-carousel" aria-label="Del campo mexicano">
      <div className="auth-carousel__photos">
        {SLIDES.map((slide, i) => {
          if (i !== index && i !== previous && i !== next) return null;
          const src = `/images/acceso/${slide.photo}`;
          return (
            <img
              key={slide.photo} className={i === index ? "is-current" : undefined}
              src={`${src}-1280.webp`} srcSet={`${src}-640.webp 640w, ${src}-1280.webp 1280w`}
              sizes="(max-width: 759px) 100vw, 48vw"
              alt={i === index ? slide.alt : ""} aria-hidden={i !== index}
              fetchPriority={i === index ? "high" : "low"}
              style={{ objectPosition: `50% ${slide.focus}` }}
            />
          );
        })}
      </div>

      <div className="auth-carousel__brand">
        {onBack ? (
          <button type="button" aria-label="Ir al catálogo de Comercio Fácil" title="Ir al catálogo" onClick={onBack}>
            {brand}
          </button>
        ) : brand}
      </div>

      <div className="auth-carousel__caption" aria-live="off">
        <h2>{active.title}</h2>
        <p>{active.copy}</p>
      </div>
    </section>
  );
}
