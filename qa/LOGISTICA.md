# Envíos a domicilio con Castores, FedEx y DHL

El comprador elige **Envío a domicilio** para productos de un mismo proveedor dentro de México. Los secos admiten Castores, FedEx o DHL. Para un carrito que contiene perecederos, el vendedor consulta a FedEx o DHL y registra el servicio que acepta ese embarque. También se puede elegir **Acordar con el vendedor**.

## Elección del transportista

Para el costal de semillas y futuras compras de mayor volumen elegimos Castores por sus servicios de paquetería y carga consolidada, el cotizador público y el rastreo mediante guía o talón. Paquetexpress también ofrece paquetería con rastreo. ATRT se especializa en transporte refrigerado para frescos. La tarifa más conveniente depende del origen, el destino, el embalaje y el volumen. Cada cotización requiere confirmar la aceptación del producto y la cobertura concreta. [Grupo Castores](https://www.castores.com.mx/servicios/paqueteria.html) · [Paquetexpress](https://www.paquetexpress.com.mx/preguntas-frecuentes/) · [ATRT](https://atrt.com.mx/)

## Probar un pedido a domicilio

1. Como cliente, agrega un producto y abre el carrito. Selecciona tu dirección y **Envío a domicilio**. Para el costal de semillas, el carrito puede mostrar una referencia de Castores. Para la caja de manzanas, el flete queda por confirmar y el vendedor verifica el servicio para esa ruta.
2. Confirma la compra. Se crea el folio y se reserva el inventario en la misma transacción. Con tarjeta, PayPal o Mercado Pago continúas a la pasarela habilitada. Con transferencia, administración registra el abono cuando lo recibe. El pedido a domicilio requiere pago previo de la mercancía. El flete se liquida directamente al transportista al recibir.
3. Como vendedor, abre **Pedidos → Registrar flete final**. Selecciona la paquetería y registra su referencia y el importe que pagará el destinatario (cero si el vendedor cubre el envío). Para FedEx o DHL indica el servicio y el plazo que te confirmaron. Para perecederos confirma también con la paquetería que acepta el producto, empaque, temperatura y plazo requeridos en esa ruta. Si ningún servicio lo acepta, cancela el pedido antes del despacho. [Condiciones nacionales de FedEx](https://www.fedex.com/es-mx/terms-and-conditions-domestic.html) · [Transporte especializado de DHL México](https://dhlsupplychain.dhl.com/transporte-soluciones-mx)
4. En **Mis pedidos** el cliente ve paquetería, servicio y costo. Usar FedEx o DHL, cambiar de servicio o exceder el máximo autorizado requiere autorizar la propuesta antes del despacho. Un pedido pagado que se cancela antes de salir libera el inventario y queda pendiente de devolución hasta que administración registre el comprobante del reembolso.
5. El vendedor contrata el servicio con la paquetería y registra la guía al entregar el paquete. El cliente encuentra en su pedido la guía y el enlace de seguimiento y puede reportar una incidencia o confirmar la recepción. FedEx y DHL se gestionan con la cuenta o sucursal del vendedor. La aplicación registra el despacho y el acuse. [Rastreo FedEx](https://www.fedex.com/es-mx/tracking.html) · [Rastreo DHL](https://www.dhl.com/mx-es/home/rastreo.html) · [Rastreo Castores](https://www.castores.com.mx/assets/files/manual-de-rastreo.pdf)

## Estimado, cobro y margen

El sistema busca una cotización vigente de Castores capturada para el mismo proveedor, código postal, productos, presentaciones y cantidades. A falta de ella, usa el último flete positivo de una entrega comparable en los últimos 90 días. Excluye las guías y tarifas marcadas como sandbox. Si falta historial y las presentaciones especifican pesos en kg o g que suman hasta 6 kg, usa **$247 MXN** como referencia. Safety Store EE publica ese importe para Castores hasta 6 kg bajo sus propias condiciones comerciales. El proveedor comprueba peso, dimensiones y cobertura con el transportista. Para cargas mayores o de peso desconocido sin historial se crea el pedido y el comprador autoriza el importe en su detalle. [Referencia comercial](https://www.safetystoreee.com/pagos-y-entregas/) · [Datos del cotizador oficial](https://www.castores.com.mx/cotizar-envio.html)

En los nuevos pedidos a domicilio, el total en la tienda y el monto de la pasarela cubren únicamente la mercancía con IVA. El estimado, el máximo autorizado y el importe a pagar al transportista se guardan por separado. La plataforma calcula su margen con la comisión cobrada menos sus propios costos. Los pedidos anteriores que incluían flete conservan el cobro y la conciliación del transporte.

## Habilitación

Las instalaciones nuevas usan `backend/db/init.sql`. Sobre una base con la migración 012, aplica 013 y después 014 antes de actualizar la API. Ambas pueden repetirse. Los folios anteriores conservan Castores, su guía y los importes registrados. Ejecuta desde la raíz sobre la base seleccionada.

```powershell
mysql -h 127.0.0.1 -u USUARIO -p NOMBRE_BASE -e "SOURCE backend/migrations/013_domicilio.sql"
mysql -h 127.0.0.1 -u USUARIO -p NOMBRE_BASE -e "SOURCE backend/migrations/014_paqueterias.sql"
```

**Pagos en la demostración.** Desde backend, `npm run audit:serve` usa MySQL local en 3318 y lee las credenciales de prueba de `backend/.env`. Configura el par de Stripe `STRIPE_SECRET_KEY` de prueba y `VITE_STRIPE_PUBLIC_KEY` de la misma cuenta en frontend. Para PayPal usa `PAYPAL_ENV=sandbox`, su ID y secreto en backend y el mismo ID público en `VITE_PAYPAL_CLIENT_ID`. Mercado Pago requiere un token identificable de prueba (`TEST-` en esta vista previa), su secreto de firma y las URL HTTPS del frontend y del backend de pruebas. El webhook debe alcanzar esa misma API. Reinicia la API y Vite si cambias variables. El carrito marca los métodos sin configuración suficiente como no disponibles.

**API opcional de Envia.com.** Configura estas variables exclusivamente en backend y reinicia la API:

| Variable | Uso |
|---|---|
| `ENVIA_ENTORNO` | `sandbox` para pruebas o `produccion` para la cuenta comercial correspondiente. Los tokens son específicos de cada entorno. |
| `ENVIA_API_TOKEN` | Token Bearer de la cuenta de Envia.com. |
| `ENVIA_ORIGENES_MX` | Objeto JSON con una dirección de origen real por ID de proveedor. Cada dirección requiere `name`, `phone`, `street`, `city`, `state` (dos letras del catálogo de Envia.com) y `postalCode` (cinco dígitos). |

Para las solicitudes del flujo anterior, el proveedor con origen configurado puede elegir la API de **carga consolidada (LTL)**, indicar una caja o tarima, peso y dimensiones exteriores y el código de estado de destino. El comprador debe tener teléfono en su perfil. La API consulta `POST /ship/rate/` con Castores, tipo 2 y moneda MXN. Entre las respuestas utilizables selecciona la menor tarifa de ese transportista. Para múltiples bultos independientes o servicios especiales se puede capturar la cotización del embarque completo. Una ruta sin tarifa conserva la solicitud pendiente. Las tarifas sandbox se identifican en pantalla. [Capacidades por transportista](https://docs.envia.com/docs/supported-carriers) · [Cotización por API](https://docs.envia.com/reference/shipping-rates)

Las guías emitidas con la cuenta conectada deben identificarse como **Envia.com** al registrar el despacho. La tienda consulta sus movimientos con `POST /ship/generaltrack/` y muestra el estado y las ubicaciones devueltas para esa guía. La confirmación de recepción en el pedido requiere el acuse. La cuenta externa, los permisos comerciales y la aceptación efectiva de la ruta deben probarse con credenciales del proyecto. [Rastreo por API](https://docs.envia.com/reference/track-shipments) · [Autenticación y entornos](https://docs.envia.com/docs/faqs)

## Verificación repetible

Con la instancia MySQL local de prueba descrita en [la guía del piloto](PILOTO.md), ejecuta las suites desde la raíz:

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Para repetir la demostración automatizada en Edge con Playwright disponible para Node:

```powershell
$env:VITE_API_URL='/api'
npm.cmd --prefix frontend run build -- --outDir ../.audit/piloto-web
node qa/verificar-piloto.cjs --castores
node qa/verificar-piloto.cjs --fedex
node qa/verificar-piloto.cjs --dhl
```

El navegador usa tres sesiones locales y verifica también el detalle en pantalla de celular. Las pruebas del adaptador reproducen respuestas de Envia.com, incluyendo falta de cobertura, moneda incorrecta y guías de otra empresa. Para evaluar el negocio en el piloto se necesitan tiempos de tránsito, tarifas con empaque real, costos de cobro, incidencias y facturas de transporte.

**Verificación con tres paqueterías.** Pasaron 43 pruebas del backend, 66 de interfaz, ESLint y la compilación. En Edge, dos pedidos sintéticos de manzanas recorrieron compra a domicilio, registro del flete por el vendedor, autorización del comprador, despacho, enlace a la paquetería y recepción con acuse, uno por FedEx y otro por DHL. También pasó el recorrido del costal seco por Castores. En los ensayos se usaron tarifas y guías ficticias. La migración 014 se aplicó dos veces sobre la misma base de demostración.

**Verificación del nuevo checkout.** Pasaron 41 pruebas de backend, 64 de interfaz, ESLint y la compilación. En Edge, la compra de un costal bajó el stock de 4 a 3. La mercancía costó $414.12, el estimado fue $247 y el cliente autorizó el flete final de prueba de $250 antes del despacho. La guía y el acuse quedaron en el mismo folio. Con $7 de comisión y $2.50 de costos propios, el margen fue $4.50. Stripe confirmó el pago con tarjeta de prueba por $414.12. PayPal Sandbox creó una orden por ese importe.

**Evidencia del flujo anterior.** Pasaron 36 pruebas de backend y 59 de interfaz. ESLint y Vite terminaron correctamente. En Edge se comprobaron tanto el flujo Castores como el pago contra entrega de la modalidad acordada. La migración 012 se aplicó dos veces a una base de prueba con la estructura anterior y conservó sus importes, pago y guía históricos. El siguiente acuse procede de esa demostración local con datos ficticios.

![Acuse de prueba de Castores en la vista móvil del comprador](seguimiento-castores.png)
