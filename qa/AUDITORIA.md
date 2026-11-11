# Auditoría de Comercio Fácil México

Este documento conserva los resultados de la auditoría anterior. La [verificación posterior de economía, inventario y piloto](PILOTO.md) detalla los cambios en reservas con pagos pendientes y en los paneles.

Se trabajó en la rama local `codex/auditoria-ecommerce`. El frontend usa React y Vite, la API usa Express y los pedidos se almacenan en MySQL. Las pruebas usaron datos sintéticos y una instancia MySQL 8 aislada en el puerto 3318. Producción quedó fuera del alcance.

| Gravedad | Problema reproducido | Corrección y comprobación |
|---|---|---|
| Crítica | Crear un pedido sobre el esquema inicial devolvía HTTP 500 por columnas de importes ausentes. | Se alinearon esquema y código. Se creó un pedido desde el navegador y se probaron las migraciones 008 y 009 sobre una copia del esquema anterior con dos pedidos históricos. |
| Crítica | Líneas duplicadas y compras simultáneas permitían inventario negativo. | El servidor agrupa cantidades, reserva existencias dentro de una transacción y reconoce los reintentos. Con una unidad y dos compras simultáneas solo una se confirmó. Una cancelación repetida devolvió la unidad una vez. |
| Crítica | La captura de PayPal aceptaba una referencia ajena en la simulación. Mercado Pago solicitaba $102 por un pedido de $118.32. | Se validan pedido, método, moneda, referencia e importe. Se probaron el rechazo de un importe insuficiente, las notificaciones firmadas y los reintentos. |
| Alta | Un vendedor podía modificar pedidos ajenos y cambiar un producto a otro proveedor. El catálogo público mostraba artículos desactivados y datos fiscales y de contacto de proveedores. | Se separó el catálogo público de la gestión. Las pruebas verificaron los permisos de cliente, vendedor y administrador. |
| Alta | Google iniciaba el acceso sin verificar el parámetro de seguridad state. La configuración de MFA permitía reemplazar un segundo factor activo. | Se vinculó la respuesta a la pestaña de origen, se añadió un código de un solo uso y se protegió MFA. Las pruebas rechazaron estados incorrectos, códigos reutilizados y correos sin verificar. |
| Media | Se perdía el carrito al recargar y se podía exceder el stock. El catálogo intentaba cargar Stripe sin clave. La API rechazaba sus propias fotos subidas. | Se comprobó la persistencia y el límite de cinco unidades, la carga diferida de las pasarelas y el ciclo de subir, asignar y servir una imagen. |
| Media | Una sesión vencida dejaba al cliente ante un historial vacío. Había controles sin nombre accesible. | Se comprobó la redirección al acceso. Se añadieron etiquetas, foco de teclado, cierre con Escape, títulos por página y descripción del sitio. Se revisó el catálogo a 390, 768 y 1280 píxeles. |
| Media | El menú ofrecía 12 categorías de abarrotes y perecederos, aunque el surtido inicial es agrícola. | Se dejaron tres grupos para la venta al mayoreo. Se probaron los filtros en celular y escritorio, el rechazo de productos retirados en el carrito y la consulta de un pedido histórico tras retirar su categoría. |

## Resultados

Pasaron 14 pruebas de integración del backend y 46 de frontend. También se ejecutaron lint y la compilación. El paquete inicial pasó de unos 123 kB a 113 kB comprimidos en la auditoría inicial.

En el navegador se buscaron manzanas, se recuperó el carrito tras identificarse y recargar, se rechazó un código postal incompleto y se confirmó un pedido contra entrega por $236.64. El detalle mostró dos unidades, subtotal de $204, IVA de $32.64 y envío en preparación. La captura se encuentra junto a este informe.

Con el nuevo surtido se filtró por Semillas, se agregó un costal de 5 kg de semilla de calabaza y se completó otro pedido contra entrega en la vista previa local. El detalle confirmó una unidad por $414.12 MXN. La vista general de los tres filtros se guardó en `catalogo-agricola.jpg`.

Stripe confirmó $118.32 MXN con su tarjeta oficial de prueba. La API de la tienda registró el pago aprobado. PayPal Sandbox creó una orden y devolvió el mismo identificador al repetir la solicitud. La captura de PayPal se comprobó con respuestas simuladas. Google mostró su pantalla oficial de acceso y se comprobó el retorno y la emisión de sesión con una identidad simulada.

## Pendientes y requisitos

- Para cerrar la verificación externa de Google y PayPal hacen falta el consentimiento de una cuenta de Google de prueba y la aprobación de un comprador PayPal Sandbox. El usuario eligió dejar ambos pasos pendientes.
- Mercado Pago requiere credenciales inequívocamente de prueba, secreto de firma y una URL de notificación HTTPS alcanzable. Solo se verificó la integración mediante simulación local. La entrega externa de webhooks tampoco se verificó para Stripe.
- Los pedidos con una referencia de pago pendiente retienen inventario. La liberación automática requiere definir un plazo y conciliar con la pasarela antes de liberar las unidades.
- La tienda implementa presentación y existencias por producto. Cupones, variantes con inventario independiente y tarifas de transporte requieren reglas de negocio. Se conservó el cálculo existente de comisión del 2 % e IVA del 16 %.
- npm reportó cero avisos en dependencias de ejecución al revisarlas. Quedaron cuatro avisos moderados en la cadena de herramientas de desarrollo del frontend. Se requiere una actualización compatible de ESLint y minimatch y repetir sus pruebas.
- Antes de una publicación autorizada se necesita aplicar las migraciones correspondientes al esquema instalado y configurar los dominios y credenciales en ese entorno. Frontend y backend tienen plantillas de entorno separadas.

## Repetir las pruebas locales

Con la instancia MySQL desechable en 127.0.0.1:3318, ejecutar `npm test` y `npm run audit:serve` en backend. El servidor crea una base nueva por ejecución con datos ficticios. En frontend, configurar `VITE_API_URL=http://127.0.0.1:3001`, ejecutar `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort` y abrir el catálogo. Para las comprobaciones del cliente usar `npm test`, `npm run lint` y `npm run build`.
