export const rutasVendedor = { panel:"/vendedor/dashboard", ventas:"/vendedor/pedidos", productos:"/vendedor/productos", cobros:"/vendedor/cobros", membresia:"/vendedor/membresia", cuenta:"/vendedor/perfil", compras:"/mis-pedidos" };
export function seccionesDe(rutas,perfil) {
  return [
    ["MI NEGOCIO", [[rutas.panel,"dashboard","Resumen"],[rutas.ventas,"receipt","Mis ventas"],[rutas.productos,"package","Mis productos"],[rutas.cobros,"wallet","Cobros"]]],
    ["MI TIENDA", [[perfil,"shop","Perfil público"],[rutas.membresia,"medal","Mi membresía"],[rutas.cuenta,"user","Datos de mi cuenta"]]],
    ["COMO CLIENTE", [["/catalogo","shoppingBag","Explorar catálogo"],[rutas.compras,"cart","Mis compras"]]],
  ];
}
