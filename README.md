# Comercio Fácil México

## Descripción del Proyecto

**Comercio Fácil México** es una plataforma digital de comercio electrónico desarrollada como proyecto académico, enfocada en **facilitar la intermediación entre proveedores y pequeños comerciantes en México**.

El sistema busca simplificar la gestión de productos, pedidos, inventarios y envíos mediante una **API REST**, permitiendo a los usuarios realizar operaciones comerciales de forma clara, organizada y accesible.

---

## Objetivo General

Desarrollar una plataforma digital que facilite el comercio entre proveedores y pequeños comerciantes en México, optimizando el proceso de gestión de productos, pedidos, pagos y envíos mediante una solución tecnológica centralizada.

---

## Objetivos Específicos

- Gestionar usuarios con distintos roles (administrador, proveedor y comerciante).
- Permitir el registro y administración de productos y categorías.
- Controlar inventarios asociados a los productos.
- Gestionar pedidos y su seguimiento.
- Administrar direcciones de envío y estados de entrega.
- Centralizar la lógica de negocio a través de una API REST segura.

---

## Alcance del Proyecto

Incluye:
- Backend desarrollado con Node.js y Express.
- API REST para operaciones CRUD.
- Autenticación y autorización con middleware.
- Conexión a base de datos MySQL.
- Gestión de productos, pedidos, pagos, envíos e inventarios.

No incluye (por ahora):
- Pagos reales en línea.
- Integración con servicios externos de paquetería.
- Aplicación móvil o frontend productivo.

---

## Tecnologías Utilizadas

- **Node.js**
- **Express.js**
- **MySQL**
- **JWT (JSON Web Tokens)** para autenticación
- **dotenv** para variables de entorno
- **Git y GitHub** para control de versiones

---

## Estructura del Backend

La estructura del backend está organizada bajo el patrón **MVC (Model–View–Controller)** y separación por responsabilidades:

```bash
backend/
│
├── src/
│   ├── config/
│   │   └── db.js                # Configuración de la base de datos
│   │
│   ├── controllers/             # Lógica de negocio
│   │   ├── auth.controller.js
│   │   ├── categoria.controller.js
│   │   ├── direccion.controller.js
│   │   ├── envio.controller.js
│   │   ├── inventario.controller.js
│   │   ├── pago.controller.js
│   │   ├── pedido.controller.js
│   │   ├── producto.controller.js
│   │   ├── proveedor.controller.js
│   │   └── usuario.controller.js
│   │
│   ├── middlewares/             # Middlewares de seguridad
│   │   ├── auth.js
│   │   └── admin.js
│   │
│   ├── routes/                  # Definición de rutas de la API
│   │   ├── auth.routes.js
│   │   ├── categorias.routes.js
│   │   ├── direccion.routes.js
│   │   ├── envio.routes.js
│   │   ├── inventario.routes.js
│   │   ├── pago.routes.js
│   │   ├── pedido.routes.js
│   │   ├── producto.routes.js
│   │   ├── proveedor.routes.js
│   │   └── usuario.routes.js
│   │
│   ├── utils/                   # Funciones auxiliares
│   │   └── validators.js
│   │
│   ├── app.js                   # Configuración principal de Express
│   └── server.js                # Punto de arranque del servidor
│
├── node_modules/
├── .env                         # Variables de entorno
├── package.json
├── package-lock.json
└── README.md
