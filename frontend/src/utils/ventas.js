import { money } from "./cart";
export const pesos = n => "$" + money(n);
const comoFecha = iso => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso+"T12:00:00" : iso);
export const fecha = iso => comoFecha(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
export const diaLocal = (iso=new Date()) => { const d=comoFecha(iso); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); };
export const normaliza = str => String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export const etapas = {
  pendiente: ["Por preparar", "amber"], en_proceso: ["En preparación", "amber"],
  enviado: ["En tránsito", "blue"], entregado: ["Entregado", "green"],
  cancelado: ["Cancelado", "gray"], esperando_pago: ["Esperando pago", "violet"],
};
export const grupos = [
  { key: "todos", label: "Todos", match: () => true },
  { key: "preparar", label: "Por preparar", match: p => ["pendiente", "en_proceso"].includes(p.estado) },
  { key: "transito", label: "En tránsito", match: p => p.estado === "enviado" },
  { key: "finalizados", label: "Finalizados", match: p => ["entregado", "cancelado"].includes(p.estado) },
  { key: "pago", label: "Esperando pago", match: p => p.estado === "esperando_pago" },
];
export const gruposCobro = ["Por cobrar", "Cobrado", "Cancelado o rechazado", "Reembolsado"];
export function estadoCobro(p) {
  if (p.pago === "reembolsado") return "Reembolsado";
  if (p.estado === "cancelado" && p.pago === "aprobado") return "Cobro por devolver";
  if (p.estado === "cancelado" || p.pago === "rechazado") return "Cancelado o rechazado";
  return p.pago === "aprobado" ? "Cobrado" : p.pago === "pendiente" ? "Por cobrar" : "Por conciliar";
}

export function importe(rows, key, group) {
  if (group === "Cobro por devolver" && key !== "total") return key === "comision" ? "$0.00" : "—";
  if (rows.some(p => p[key] == null)) return "Sin desglose";
  return pesos(rows.reduce((sum, p) => sum + Math.round(Number(p[key]) * 100), 0) / 100);
}
export function ventaDelPedido(p) {
  return { id:p.id, cliente:p.usuario_nombre, fecha:p.fecha, estado:p.estado, pago:p.pago_estado,
    producto:{ nombre:p.producto_nombre || "Pedido al mayoreo", image_url:p.image_url }, productosDistintos:Number(p.productos_distintos || 1),
    base:p.importe_proveedor, comision:p.comision, iva:p.iva, flete:p.flete ?? 0, total:p.total };
}
