import { useState } from 'react';
import { imageUrl } from '../../utils/config';
import Icon from './Icon';

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

export default function ProductPhoto({ name, url, eager }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const src = imageUrl(url);
  if (src && src !== failedUrl) {
    return <img className="catalog-product-photo" src={src} alt={name} decoding="async"
      loading={eager ? "eager" : "lazy"} onError={() => setFailedUrl(src)} />;
  }
  const normalized = (name || '').trim().toLocaleLowerCase("es-MX").replace(/^(?:caja|bolsa|costal|saco) de /, "");
  const photo = referencePhotos.find(([pattern]) => pattern.test(normalized));
  if (photo) {
    const label = `Imagen ilustrativa de ${photo[2]}`;
    return <span className="catalog-reference-photo" role="img" aria-label={label} title={label}
      style={{ backgroundPosition: photo[1] }} />;
  }
  return <span className="catalog-no-photo" role="img" aria-label="Fotografía no disponible"><Icon name="package" size={44} /></span>;
}
