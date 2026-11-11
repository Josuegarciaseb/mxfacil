import { http } from './api';

// A rotating, deterministic sample: one available product per supplier.
export function featuredProducts(entries, slot = Math.floor(Date.now() / 3600000)) {
  const groups = new Map();
  for (const entry of entries) {
    if (!entry.product.proveedor_pro || entry.product.stock <= 0 || !entry.product.activo) continue;
    const id = entry.product.proveedor_id;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(entry);
  }
  const ids = [...groups.keys()].sort((a, b) => a - b);
  return ids.slice(0, 4).map((_, i) => {
    const products = groups.get(ids[(i + slot) % ids.length]);
    return products[slot % products.length];
  });
}
const sent = new Set();
export function recordProEvent(product, tipo) {
  if (!product.proveedor_pro) return;
  try {
    let sesion = sessionStorage.getItem('mx-pro-session');
    if (!sesion) { sesion = crypto.randomUUID(); sessionStorage.setItem('mx-pro-session', sesion); }
    const day = new Date().toISOString().slice(0, 10);
    const key = `${sesion}:${product.id}:${tipo}:${day}`;
    if (sent.has(key)) return;
    sent.add(key);
    http('/membresia/eventos', { method: 'POST', body: JSON.stringify({ producto_id: product.id, sesion, tipo }) })
      .catch(() => sent.delete(key));
  } catch { /* Metrics must never interrupt shopping. */ }
}
