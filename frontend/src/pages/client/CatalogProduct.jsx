import { recordProEvent } from '../../utils/membresia';
import { useEffect, useRef, useState } from "react";
import Icon from "../../components/ui/Icon";
import { imageUrl } from "../../utils/config";
import { money } from "../../utils/cart";

// Each position selects one photograph in the shared two-row product sheet.
const referencePhotos = [
  [/^(?:jitomates?|tomates? (?:saladet|rojos?))\b/, "0% 0%", "jitomate"],
  [/^manzanas?(?:$| de | rojas?\b| gala\b| red delicious\b)/, "33.3333% 0%", "manzana roja"],
  [/^aguacates?(?:$| de | hass\b)/, "66.6667% 0%", "aguacate Hass"],
  [/^arroz(?:$| de | (?:extra |blanco\b))/, "100% 0%", "arroz blanco"],
  [/^frijol(?:es)? pintos?\b/, "0% 100%", "frijol pinto"],
  [/^mangos?\b/, "33.3333% 100%", "mango"],
  [/^maíz (?:amarillo|en grano)\b/, "66.6667% 100%", "maíz en grano"],
  [/^(?:semillas? de calabaza|pepitas?)\b/, "100% 100%", "semilla de calabaza"],
];

function ProductPhoto({ product, eager }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const src = imageUrl(product.image_url);
  if (src && src !== failedUrl) {
    return <img className="catalog-product-photo" src={src} alt={product.nombre} decoding="async"
      loading={eager ? "eager" : "lazy"} onError={() => setFailedUrl(src)} />;
  }
  const name = product.nombre.trim().toLocaleLowerCase("es-MX").replace(/^(?:caja|bolsa|costal|saco) de /, "");
  const photo = referencePhotos.find(([pattern]) => pattern.test(name));
  if (photo) {
    const label = `Imagen ilustrativa de ${photo[2]}`;
    return <span className="catalog-reference-photo" role="img" aria-label={label} title={label}
      style={{ backgroundPosition: photo[1] }} />;
  }
  return <span className="catalog-no-photo" role="img" aria-label="Fotografía no disponible"><Icon name="package" size={44} /></span>;
}

export default function CatalogProduct({ product, price, status, inCart, eager, onAdd, promoted = false }) {
  const article = useRef(null);
  useEffect(() => {
    if (!product.proveedor_pro || !globalThis.IntersectionObserver) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { recordProEvent(product, 'impresion'); observer.disconnect(); }
    }, {threshold: 0.5});
    if (article.current) observer.observe(article.current);
    return () => observer.disconnect();
  }, [product]);
  const [requested, setRequested] = useState(1);
  const remaining = Math.max(0, (Number(product.stock) || 0) - inCart);
  const maxQuantity = Math.max(1, remaining);
  const quantity = Math.min(requested || 1, maxQuantity);
  const unit = product.presentacion?.trim().toLocaleLowerCase("es-MX")
    .match(/^(caja|costal|bolsa|saco|paquete|pieza|bulto|charola|manojo|atado|tarima|kg|litro)\b/)?.[1] || "unidad";
  const titleId = `catalog-product-${promoted ? "promo-" : ""}${product.id}`;

  return (
    <article ref={article} className="catalog-product" aria-labelledby={titleId}>
      <div className="catalog-image-area">
        <ProductPhoto product={product} eager={eager} />
        <span className={`catalog-stock catalog-stock--${status.id}`}>
          <i aria-hidden="true" />{status.label}
        </span>
      </div>
      <div className="catalog-product-info">
        <h2 id={titleId}>{product.nombre}</h2>
        {product.proveedor_nombre && <p className="catalog-supplier"><Icon name="store" size={14} />{product.proveedor_nombre}</p>}
        {!!product.proveedor_pro && <span className="pro-badge">Proveedor Pro</span>}
        {product.presentacion && <span className="catalog-pack">{product.presentacion}</span>}
        {product.descripcion && <p className="catalog-description" title={product.descripcion}>{product.descripcion}</p>}
      </div>
      <div className="catalog-purchase">
        <p className="catalog-price"><strong>${money(price)}</strong> <span>MXN / {unit}</span></p>
        <p className="catalog-terms">Pedido mínimo de 1 {unit} <span>IVA incluido</span></p>
        <div className="catalog-purchase-actions">
          <div className="catalog-stepper" role="group" aria-label={`Cantidad de ${product.nombre}`}>
            <button type="button" aria-label={`Restar una unidad de ${product.nombre}`}
              disabled={quantity <= 1} onClick={() => setRequested(quantity - 1)}>−</button>
            <input type="number" inputMode="numeric" aria-label={`Cantidad seleccionada de ${product.nombre}`}
              min={1} max={maxQuantity} step={1} disabled={!remaining} value={requested === "" ? "" : quantity}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                setRequested(Number.isFinite(value) ? Math.min(maxQuantity, Math.max(1, Math.trunc(value))) : "");
              }}
              onBlur={() => setRequested(quantity)} />
            <button type="button" aria-label={`Sumar una unidad de ${product.nombre}`}
              disabled={quantity >= remaining} onClick={() => setRequested(quantity + 1)}>+</button>
          </div>
          <button className="catalog-add" type="button" aria-label={`Agregar ${product.nombre}`}
            disabled={remaining === 0} onClick={() => { onAdd(product, quantity); setRequested(1); }}>
            <Icon name="cart" size={15} />{remaining === 0 && inCart > 0 ? "En carrito" : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}
