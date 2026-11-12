import { cartTotals, publicPrice } from "../src/utils/cart";

// Una tienda ficticia y un corte fijo para que los filtros sean reproducibles.
export const diaMuestra = "2026-11-12";
export const cuenta = { nombre: "Mariana Vega", iniciales: "MV", proveedor: 7, tienda: "Huerta del Valle" };
export const perfilPropio = "/proveedores/" + cuenta.proveedor;
const proveedores = { 7: cuenta.tienda, 12: "Granos de la Sierra", 18: "Cosecha del Bajío" };
const categorias = ["Frutas y verduras", "Granos y legumbres", "Semillas"].map((nombre, i) => ({ id: i + 1, nombre }));
const articulos = [
  [1, "Jitomate saladet", 7, 1, "Caja de 10 kg", 240, 42, "Jitomate firme, seleccionado por tamaño para venta en tienda."],
  [2, "Aguacate Hass", 7, 1, "Caja de 10 kg", 650, 18, "Fruto de pulpa cremosa y maduración uniforme."],
  [3, "Mango Ataulfo", 7, 1, "Caja de 8 kg", 280, 27, "Mango dulce de pulpa suave, seleccionado a mano."],
  [4, "Maíz amarillo en grano", 7, 2, "Costal de 25 kg", 195, 34, "Grano limpio y seco para abasto al mayoreo."],
  [5, "Frijol pinto", 12, 2, "Costal de 25 kg", 810, 22, "Frijol seleccionado de la temporada."],
  [6, "Arroz blanco", 12, 2, "Costal de 20 kg", 480, 30, "Grano largo de cocción uniforme."],
  [7, "Manzana roja", 18, 1, "Caja de 12 kg", 390, 16, "Manzana crujiente para fruterías y cocinas."],
  [8, "Semilla de calabaza", 18, 3, "Bolsa de 5 kg", 525, 4, "Pepita limpia y lista para tostar."],
];
const opiniones = [
  { id: 32, producto_id: 1, calidad: 5, servicio: 5, comentario: "El jitomate llegó firme y con muy buen tamaño.", creado_en: "2026-11-09T16:00:00Z" },
  { id: 29, producto_id: 2, calidad: 5, servicio: 4, comentario: "Buen punto de maduración. Volvería a pedir.", creado_en: "2026-11-05T16:00:00Z" },
];
function resumen(rows) {
  const average = key => rows.length ? rows.reduce((sum, row) => sum + row[key], 0) / rows.length : null;
  return { total: rows.length, calidad: average("calidad"), servicio: average("servicio") };
}
export const productos = articulos.map(([id, nombre, proveedor_id, categoria_id, presentacion, precio, stock, descripcion]) => {
  const review = resumen(opiniones.filter(r => r.producto_id === id));
  return { id, nombre, proveedor_id, proveedor_nombre: proveedores[proveedor_id], categoria_id,
    presentacion, precio, stock, descripcion, activo: 1, resenas_total: review.total, calidad_promedio: review.calidad };
});
export const propios = productos.filter(p => p.proveedor_id === cuenta.proveedor);
export { pesos, fecha } from "../src/utils/ventas";
function venta(id, cliente, productoId, qty, dia, estado, pago, flete = 0) {
  const producto = productos.find(p => p.id === productoId);
  const item = { ...producto, precio: publicPrice(producto.precio), qty };
  const { total, iva, subtotal } = cartTotals([item]);
  const base = producto.precio * qty;
  return { id, cliente, producto, qty, fecha: dia, estado, pago, base, comision: +(subtotal - base).toFixed(2), iva, flete, total: total + flete };
}
export const ventas = [
  venta(1048, "Abarrotes La Plaza", 1, 4, diaMuestra, "pendiente", "aprobado"),
  venta(1047, "Mercado San Juan", 2, 3, diaMuestra, "enviado", "aprobado", 120),
  venta(1046, "Frutería Los Pinos", 3, 5, diaMuestra, "en_proceso", "pendiente"),
  venta(1045, "Cocina Jacaranda", 4, 6, "2026-11-11", "entregado", "aprobado"),
  venta(1044, "Tienda El Trébol", 2, 2, "2026-11-11", "pendiente", "aprobado"),
  venta(1043, "Abarrotes La Plaza", 1, 3, "2026-11-10", "enviado", "pendiente"),
  venta(1042, "Mercado San Juan", 4, 4, "2026-11-10", "esperando_pago", "pendiente"),
  venta(1041, "Comedor La Milpa", 3, 2, "2026-11-09", "enviado", "aprobado", 80),
  venta(1040, "Frutería Los Pinos", 1, 5, "2026-11-08", "en_proceso", "aprobado"),
  venta(1039, "Cocina Jacaranda", 2, 2, "2026-11-06", "entregado", "pendiente"),
  venta(1038, "Tienda El Trébol", 4, 2, "2026-11-03", "cancelado", "reembolsado"),
  venta(1037, "Comedor La Milpa", 3, 3, "2026-10-29", "entregado", "aprobado"),
];
export const direcciones = [
  { id: 1, nombre: "Bodega principal", calle: "Calle del Mercado 24", ciudad: "Puebla, Puebla", cp: "72000" },
  { id: 2, nombre: "Local de venta", calle: "Avenida de la Huerta 18", ciudad: "Atlixco, Puebla", cp: "74200" },
];
const muestraArroz = { ...productos[5], precio: publicPrice(productos[5].precio), qty: 2 };
export const comprasIniciales = [{ id: 501, fecha: "2026-11-08", items: [muestraArroz], estado: "entregado",
  direccion: direcciones[0], ...cartTotals([muestraArroz]) }];

// Sólo el compilador de la vista previa conecta este adaptador a los componentes
// públicos. Se usan el catálogo, el perfil y las reseñas reales, sin tocar la API.
export async function http(path) {
  if (path === "/productos") return productos;
  if (path === "/categorias") return categorias;
  const perfil = path.match(/^\/proveedores\/(\d+)\/perfil$/);
  if (perfil && proveedores[perfil[1]]) {
    const id = Number(perfil[1]);
    const rows = opiniones.filter(r => productos.find(p => p.id === r.producto_id)?.proveedor_id === id)
      .map(r => ({ ...r, producto_nombre: productos.find(p => p.id === r.producto_id).nombre }));
    return { proveedor: { id, nombre: proveedores[id] }, resumen: resumen(rows), resenas: rows, siguiente: null };
  }
  const reviews = path.match(/^\/productos\/(\d+)\/resenas$/);
  if (reviews) {
    const rows = opiniones.filter(r => r.producto_id === Number(reviews[1]));
    return { resumen: resumen(rows), resenas: rows, siguiente: null };
  }
  throw new Error("No hay datos de ejemplo para esta consulta.");
}
