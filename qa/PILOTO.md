# Operación y verificación del piloto

La revisión parte de `743244e`. En esa versión el panel del vendedor sumaba el total de todos sus pedidos como «Ingresos». La compra ya reservaba inventario en una transacción. El vacío aparecía cuando un pago iniciado quedaba pendiente y no había un proceso que conciliara la referencia al vencer su plazo.

## Cómo leer un pedido

El precio de catálogo del proveedor es la base. La tienda trabaja en centavos y mantiene el criterio de cálculo que ya aplicaba el checkout. Redondea el precio unitario de venta después de añadir el 2 % sobre el precio base, multiplica por cantidad y suma las líneas para obtener el subtotal. La comisión es la diferencia entre el importe de mercancía a precio base y el subtotal de venta. El sistema calcula el IVA como 16 % del subtotal y redondea una sola vez el impuesto del pedido. El total es subtotal más IVA.

| Concepto del costal de prueba | MXN |
|---|---:|
| Mercancía a precio base | 350.00 |
| Comisión incluida en el precio | 7.00 |
| Subtotal antes de IVA | 357.00 |
| IVA calculado por el sistema | 57.12 |
| Importe del pedido al cliente | 414.12 |

El carrito y el servidor ordenan las líneas por ID de producto para distribuir cualquier centavo residual del IVA. El impuesto de cada línea es el incremento del impuesto acumulado al añadirla. Así, la suma por proveedores coincide con el folio aun cuando calcular y redondear cada proveedor por separado daría otro importe. MySQL conserva el precio base, el precio de venta, el IVA de línea y el proveedor del momento de la compra. Los cambios posteriores en el catálogo no redistribuyen esas líneas.

**Definición fiscal pendiente.** La tasa, la base aplicable por producto, el tratamiento de la comisión y quién factura a quién requieren una definición del negocio y revisión fiscal. El cálculo descrito reproduce la regla vigente del prototipo. La comisión cobrada que aparece en el piloto es un indicador operativo sujeto a conciliación con los pagos y los costos reales.

### Panel del vendedor

Cada folio aparece una vez por proveedor y en un solo grupo de cobro. Las columnas distinguen mercancía a precio base, comisión de plataforma, IVA e importe total pagadero por el comprador. El importe del proveedor representa mercancía vendida a precio base. Para conocer una liquidación bancaria al proveedor haría falta registrar esa transferencia.

| Grupo | Condición |
|---|---|
| Por cobrar | Pago pendiente en un pedido vigente. Incluye contra entrega incluso si ya se registró la entrega física. |
| Cobrado | Pago aprobado de un pedido vigente. La confirmación procede de la pasarela o del registro administrativo con comprobante. |
| Cancelado o rechazado | Pedido cancelado sin cobro vigente o pago rechazado. |
| Cobro por devolver | Una notificación verificada de Stripe o Mercado Pago acredita el importe después de cancelar. El folio sigue cancelado con comisión cero y sin nuevo descuento de inventario. Administración concilia el abono y registra el reembolso completo con comprobante. |
| Reembolsado | Devolución total registrada. Sus importes salen del grupo cobrado y la comisión realizada queda en cero. |
| Por conciliar | Folio histórico sin estado de pago clasificable. |

En `Administración → Pedidos`, abre el folio para registrar el comprobante de un cobro manual. Para contra entrega primero se registra la entrega. Para transferencia, se verifica el abono antes de procesar o despachar el pedido. El botón de reembolso registra una devolución total que ya se efectuó en caja, banco o pasarela. Guarda su referencia y no inicia una transferencia de dinero. Los ajustes parciales requieren una política y un registro de movimientos propios.

El vendedor consulta exclusivamente sus líneas y sus importes. Puede avanzar un pedido compuesto íntegramente por sus productos. En un pedido con varios proveedores, administración coordina el cambio del estado común del folio.

Los clientes directos de `POST /api/pedidos` deben incluir `clave_checkout` (16 a 64 letras, dígitos, guiones o guiones bajos). El carrito ya la genera. Reutilizar la misma clave para la misma compra devuelve el folio previo, incluso si su estado ya cambió. Reutilizarla con contenido distinto devuelve 409. Una solicitud sin clave se rechaza antes de reservar unidades.

## Política de existencias

Crear el folio descuenta las unidades disponibles y guarda la reserva en la misma transacción. El indicador interno `stock_reservado` señala que esas unidades ya fueron descontadas. El cobro confirma el descuento existente. La liberación repone las unidades y desactiva el indicador bajo bloqueo de pedido y pago. Los reintentos de un checkout conservan su clave de compra. El servidor valida precios y cantidades y bloquea el inventario en orden de ID de producto.

| Método | Plazo inicial del piloto | Confirmación, cancelación o vencimiento |
|---|---|---|
| Contra entrega | Hasta cancelar o despachar | Se prepara con pago pendiente. Una cancelación previa al despacho puede reponer la mercancía. Una entrega física deja el pago pendiente hasta registrar el comprobante de cobro. |
| Transferencia | 24 horas | El administrador registra el abono. Sin confirmación al vencimiento, se cancela y libera. Un depósito recibido después del cierre requiere conciliación bancaria. |
| Stripe | 30 minutos | Se verifica la identidad e importe del intento. Un intento fallido puede reintentarse dentro del plazo. Al cierre se comprueba o cancela el intento remoto antes de reponer. |
| PayPal | 30 minutos | Se verifica orden y captura. La tienda conserva una marca durable cuando empieza una captura. Una respuesta perdida conserva la reserva mientras se comprueba el resultado. |
| Mercado Pago | 30 minutos | La preferencia tiene vencimiento. Al cerrarla se consultan las órdenes y sus intentos de pago. Un intento rechazado por sí solo no cierra una preferencia reutilizable. Se deja una gracia de cinco minutos tras el cierre para la publicación de intentos. |

El proceso normal de la API (`npm start` o `npm run dev` en backend) concilia al iniciar y cada 60 segundos. Dos instancias concurrentes vuelven a comprobar el estado bajo bloqueo. Si la pasarela no responde o hay un intento no terminal, preserva la reserva, registra el ID para seguimiento y vuelve a intentarlo. Una incidencia persistente requiere revisar la referencia en la pasarela. El plazo de cinco minutos de Mercado Pago es un parámetro operativo del código cuya suficiencia requiere validación externa. Las órdenes históricas ya despachadas o entregadas requieren revisar el estado físico antes de una reposición.

Un reembolso previo al despacho puede cancelar el pedido y devolver las unidades. Después del despacho se registra el reembolso financiero y se conserva el movimiento físico. La devolución efectiva de mercancía entregada requiere revisar su recepción y condición antes de un ajuste de inventario.

## Medición con comercios

En `Administración → Panel de Control → Medición del piloto`, elige las fechas de creación de pedidos, las cuentas de tienda y, si corresponde, los proveedores. Ambos extremos del periodo se incluyen según el calendario de la base. El filtro de proveedores conserva folios con todas sus líneas en el grupo seleccionado, para poder atribuir el costo completo a ese grupo. Los resultados muestran el **estado actual** de esos folios y pueden cambiar si después se entrega o reembolsa un pedido.

| Indicador | Cómo se obtiene |
|---|---|
| Tiempo para completar la compra | Segundos desde que el servidor registra la última apertura del carrito con artículos y sesión iniciada hasta que crea el folio. El promedio muestra su número de observaciones. Los históricos y aperturas sin medición quedan fuera del promedio. |
| Tiendas compradoras y recurrentes | Una cuenta con al menos un folio vigente cobrado en el periodo es compradora. Dos o más folios cobrados la hacen recurrente. El piloto debe identificar qué cuenta corresponde a cada comercio físico. |
| Entregados, cancelados y pendientes | Clasificación logística por folio. Pendientes incluye todos los que aún no están entregados ni cancelados. Un pedido físicamente entregado puede tener un pago pendiente o reembolsado. |
| Comisión obtenida | Suma de la comisión registrada en los pedidos vigentes con pago aprobado. Al registrar un reembolso completo la comisión obtenida del folio pasa a cero. |
| Costo y margen | Administración registra el costo variable total asumido por la plataforma en MXN. Vacío conserva el costo y el margen como desconocidos. Un cero explícito confirma costo cero. Margen observado = comisión obtenida menos costo variable, incluso en un folio cancelado o reembolsado. |

El guardado de costos comprueba el valor anterior para evitar sobrescribir una edición concurrente. Un mismo valor puede reenviarse. Para el piloto conviene conservar los comprobantes de cobro, reparto, soporte o devoluciones que componen cada total.

La propuesta de dos semanas, dos proveedores y cinco tiendas aún requiere reclutamiento y actividad real. Antes de comenzar, acuerden las cuentas participantes, quién registra costos, los horarios y responsabilidades de conciliación, y cómo medir una compra comparable por el canal habitual. Al terminar podrán contrastar tiempos, recompra y margen con sus observaciones. Las cifras de prueba de esta guía corresponden a cuentas ficticias.

## Instalación y actualización

1. **Base nueva.** Inicializar con `backend/db/init.sql`. Incluye la estructura 011.
2. **Base existente hasta 010.** Respaldar y comprobar la restauración en ensayo. Detener escrituras de la aplicación, seleccionar la base correcta y ejecutar con el cliente `mysql` la migración `backend/migrations/011_economia_reservas_piloto.sql`. Usa MySQL 8.0.16 o posterior con InnoDB, y permisos para tablas y rutinas temporales de migración. Un ejemplo desde la raíz en una base local de ensayo es `mysql -h 127.0.0.1 -u USUARIO -p NOMBRE_BASE -e "SOURCE backend/migrations/011_economia_reservas_piloto.sql"`.
3. **Históricos.** La migración conserva cantidades, importes y stock. Para líneas antiguas fija el proveedor que el catálogo atribuía al ejecutar la migración. En pedidos exclusivos se usan los totales almacenados. Para históricos mixtos sin datos demostrables por línea el panel indica «Sin desglose». Los tiempos y costos previos quedan desconocidos. Las reservas impagas migradas reciben un plazo de gracia desde la actualización, de 30 minutos para digitales y 24 horas para transferencias. En PayPal se trata de forma conservadora una referencia previa sin constancia de su captura.
4. **Configuración.** Para pedidos nuevos, `RESERVA_DIGITAL_MINUTOS` y `RESERVA_TRANSFERENCIA_MINUTOS` son enteros de 1 a 525600 y toman por defecto 30 y 1440. Se fijan al crear el pedido. Mantener los secretos de sesión configurados para firmar también el inicio de medición. Desplegar backend y frontend compatibles después de aplicar el esquema. Para volver a una versión anterior, detener las escrituras y restaurar un respaldo compatible considerando los movimientos posteriores al corte.

## Repetir la verificación local

Se verificó con Node 24 y MySQL 8.0.46. Las suites del backend usan bases aleatorias de prueba y datos ficticios en `127.0.0.1:3318`. Para repetirlas se necesita una instancia MySQL **desechable y exclusiva**, en loopback, con usuario de prueba `root` sin contraseña y permiso para crear bases. Los auxiliares de prueba configuran sus propios secretos y métodos de pago simulados.

Desde la raíz, con las dependencias instaladas en cada proyecto:

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Para la comprobación en navegador se necesita el módulo Playwright disponible para Node y un navegador compatible. La ejecución utiliza Edge sin interfaz por defecto. Se puede indicar un canal instalado con `QA_BROWSER_CHANNEL`. En PowerShell, dentro de una sesión de pruebas:

```powershell
$env:VITE_API_URL='/api'
npm.cmd --prefix frontend run build -- --outDir ../.audit/piloto-web
node qa/verificar-piloto.cjs
```

La prueba abre sesiones de comprador, vendedor y administrador. Verifica la compra, el mismo folio y su actualización, el movimiento de cuatro a tres costales, el cobro con comprobante, la edición del costo y el reembolso. El navegador solo permite solicitudes al servidor local. La verificación de pagos digitales usa dobles de las pasarelas. La aprobación de una cuenta externa, el movimiento bancario y la entrega de notificaciones desde Internet requieren una prueba de aceptación con cuentas sandbox y un endpoint alcanzable.

## Resultados del 10 de noviembre de 2026

| Comprobación | Resultado observado |
|---|---|
| API y MySQL | 32 de 32 pruebas aprobadas. Incluyen concurrencia sobre la última unidad, reintento de compra, notificaciones duplicadas, cobros tardíos, reembolsos en tránsito y aislamiento de dos proveedores. |
| Interfaz | 56 de 56 pruebas aprobadas en ocho archivos. ESLint y la compilación de Vite terminaron con código de salida cero. |
| Sintaxis | Node verificó los 56 archivos JavaScript de backend, pruebas de backend y guion de navegador. |
| Navegador | Tres sesiones de Edge completaron el mismo folio. La existencia bajó de 4 a 3. El cliente vio «En proceso». Tras entregar, el importe siguió por cobrar hasta registrar el comprobante. |
| Economía del folio de prueba | $350.00 de mercancía, $7.00 de comisión, $57.12 de IVA y $414.12 de total. Con costo desconocido, el margen permaneció indeterminado. Al registrar cero fue $7.00. Con costo de $2.50 pasó a $4.50 y, tras registrar el reembolso, a −$2.50. El stock entregado permaneció en 3. |
| Actualización de datos | La migración 011 se aplicó dos veces a una base creada con el esquema de `743244e` y dos pedidos históricos. Se conservaron totales, existencias y el plazo ya asignado. También se probó el tratamiento de una transferencia antigua en preparación. |

## Archivos de la implementación

| Directorio | Archivos modificados o añadidos |
|---|---|
| Raíz | `README.md` |
| `backend` | `.env.example`, `package.json`, `db/init.sql`, `migrations/011_economia_reservas_piloto.sql` |
| `backend/src` | `app.js`, `server.js`, `routes/piloto.routes.js` |
| `backend/src/controllers` | `pedido.controller.js`, `pago.controller.js`, `envio.controller.js`, `piloto.controller.js` |
| `backend/src/services` | `order-state.service.js`, `payment-reconciliation.service.js`, `reservas.service.js`, `vendor-orders.service.js`, `piloto.service.js`, `stripe.service.js`, `paypal.service.js`, `mercadopago.service.js` |
| `backend/test` | `economia.test.js`, `reservas.test.js`, `piloto.test.js` |
| `frontend/src` | `App.jsx`, `constants/index.jsx`, `utils/cart.js`, `pages/PaymentReturn.jsx` |
| `frontend/src/pages` | `admin/Dashboard.jsx`, `admin/Pedidos.jsx`, `admin/Piloto.jsx`, `client/CartModal.jsx`, `client/Pedidos.jsx`, `vendor/Dashboard.jsx` |
| `frontend/src/tests` | `checkout.test.jsx`, `piloto.test.jsx`, `vendedor-dashboard.test.jsx` |
| `qa` | `AUDITORIA.md`, `PILOTO.md`, `verificar-piloto.cjs` |
