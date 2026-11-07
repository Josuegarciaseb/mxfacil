const cents = value => Math.round((Number(value) + Number.EPSILON) * 100);
export const publicPrice = base => Math.round(cents(base) * 102 / 100) / 100;
export const gross = net => (cents(net) + Math.round(cents(net) * 16 / 100)) / 100;
export const money = value => Number(value).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
export function cartTotals(cart) {
  let subtotal = 0, tax = 0;
  const lines = {};
  for (const item of cart) {
    const net = cents(item.precio) * item.qty;
    subtotal += net;
    const nextTax = Math.round(subtotal * 16 / 100);
    lines[item.id] = (net + nextTax - tax) / 100;
    tax = nextTax;
  }
  return { subtotal:subtotal/100, iva:tax/100, total:(subtotal+tax)/100, lines };
}
export const cartKey = user => user?.id ? `cart_${user.id}` : 'guest_cart';
export function readCart(user) {
  try {
    const data = JSON.parse(localStorage.getItem(cartKey(user)));
    return Array.isArray(data) ? data.filter(i => i && Number.isSafeInteger(i.id) && Number.isSafeInteger(i.qty) && i.qty > 0 && Number.isFinite(Number(i.precio)) && Number(i.precio)>=0) : [];
  } catch { return []; }
}
export function mergeCart(saved, guest) {
  const rows = new Map(saved.map(i=>[i.id,i]));
  for (const item of guest) rows.set(item.id,{...item,qty:Math.min(Number(item.stock),item.qty+(rows.get(item.id)?.qty||0))});
  return [...rows.values()].filter(i=>i.qty>0);
}
export function refreshCart(cart, products) {
  const fresh = new Map(products.map(p=>[p.id,p]));
  return cart.flatMap(i=>{
    const p=fresh.get(i.id);
    return p?.stock>0 ? [{...p,precio:publicPrice(p.precio),qty:Math.min(p.stock,i.qty)}] : [];
  });
}
