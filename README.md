# Comercio Fácil México

<div align="left">

![Node.js](https://badgen.net/badge/Node.js/18+/green?icon=node)
![Express](https://badgen.net/badge/Express/4.x/black)
![React](https://badgen.net/badge/React/18+/cyan?icon=npm)
![MySQL](https://badgen.net/badge/MySQL/8.x/blue)
![JWT](https://badgen.net/badge/JWT/Auth/orange)

**Plataforma fullstack de comercio electrónico para intermediación entre proveedores y pequeños comerciantes en México**

</div>

---

##  Tabla de Contenidos

- [Descripción](#-descripción)
- [Objetivos](#-objetivos)
- [Alcance](#-alcance)
- [Tecnologías](#-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Base de Datos](#-base-de-datos)
- [Uso](#-uso)
- [Endpoints de la API](#-endpoints-de-la-api)
- [Vistas del Frontend](#-vistas-del-frontend)
- [Roles y Permisos](#-roles-y-permisos)
- [Contribución](#-contribución)

---

##  Descripción

**Comercio Fácil México** es una plataforma digital fullstack de comercio electrónico desarrollada como proyecto académico. Su propósito es **facilitar la intermediación entre proveedores y pequeños comerciantes en México**, simplificando la gestión de productos, pedidos, inventarios y envíos.

El proyecto está organizado como un **monorepo** con dos partes bien separadas:

- **Backend:** API REST con Node.js y Express, autenticación JWT y base de datos MySQL.
- **Frontend:** Aplicación web con React que consume la API y presenta una interfaz intuitiva tanto para clientes como para administradores.

---

##  Objetivos

### Objetivo General

Desarrollar una plataforma digital que facilite el comercio entre proveedores y pequeños comerciantes en México, optimizando la gestión de productos, pedidos, pagos y envíos mediante una solución tecnológica centralizada.

### Objetivos Específicos

- Gestionar usuarios con distintos roles: **administrador**, **vendedor** y **cliente**.
- Permitir el registro y administración de **productos y categorías**.
- Controlar **inventarios** asociados a los productos.
- Gestionar **pedidos** y su seguimiento completo (estados, items, pago, envío).
- Administrar **direcciones de envío** y estados de entrega.
- Proveer una **interfaz web** clara y accesible para clientes y administradores.
- Centralizar la lógica de negocio a través de una **API REST segura** con autenticación JWT.

---

##  Alcance

###  Incluye

- Backend con **Node.js** y **Express** siguiendo el patrón MVC.
- **API REST** completa para operaciones CRUD sobre todos los recursos.
- Autenticación y autorización con **JWT** y middlewares por rol.
- Conexión a base de datos **MySQL** con esquema en 3FN.
- Frontend en **React** con rutas protegidas según rol.
- Vistas de catálogo, carrito, checkout, pedidos, perfil y panel de administración.
- Validación de datos tanto en el cliente como en el servidor.
- Endpoint de salud (`/api/health`) para verificar disponibilidad.

###  No Incluye (por ahora)

- Pasarela de pagos reales en línea.
- Integración con servicios externos de paquetería.
- Notificaciones por correo o push.

---

##  Tecnologías

### Backend

| Tecnología | Versión | Descripción |
|---|---|---|
| **Node.js** | ≥ 18 | Entorno de ejecución JavaScript |
| **Express.js** | ^4.19 | Framework web para la API REST |
| **MySQL** | ≥ 8 | Base de datos relacional |
| **mysql2** | ^3.9 | Driver MySQL para Node.js |
| **jsonwebtoken** | ^9.0 | Autenticación basada en tokens JWT |
| **bcryptjs** | ^3.0 | Hashing seguro de contraseñas |
| **dotenv** | ^16.4 | Gestión de variables de entorno |
| **cors** | ^2.8 | Configuración de CORS |
| **nodemon** | ^3.1 | Recarga automática en desarrollo |

### Frontend

| Tecnología | Descripción |
|---|---|
| **React 18** | Librería de interfaz de usuario |
| **React Router** | Enrutamiento del lado del cliente y rutas protegidas |
| **Axios** | Cliente HTTP para consumir la API REST |
| **Context API / useState** | Gestión del estado global (autenticación, carrito) |
| **Vite** | Herramienta de build y servidor de desarrollo |

---

##  Estructura del Proyecto

El repositorio es un **monorepo** con el backend y el frontend en carpetas separadas:

```
mxfacil/
│
├── backend/                        # API REST — Node.js + Express
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # Pool de conexión a MySQL
│   │   │
│   │   ├── controllers/            # Lógica de negocio por módulo
│   │   │   ├── auth.controller.js
│   │   │   ├── categoria.controller.js
│   │   │   ├── direccion.controller.js
│   │   │   ├── envio.controller.js
│   │   │   ├── inventario.controller.js
│   │   │   ├── pago.controller.js
│   │   │   ├── pedido.controller.js
│   │   │   ├── producto.controller.js
│   │   │   ├── proveedor.controller.js
│   │   │   └── usuario.controller.js
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.js             # Verifica token JWT
│   │   │   └── admin.js            # Restringe acceso a administradores
│   │   │
│   │   ├── routes/                 # Rutas por recurso
│   │   │   ├── auth.routes.js
│   │   │   ├── categorias.routes.js
│   │   │   ├── direccion.routes.js
│   │   │   ├── envio.routes.js
│   │   │   ├── inventario.routes.js
│   │   │   ├── pago.routes.js
│   │   │   ├── pedido.routes.js
│   │   │   ├── producto.routes.js
│   │   │   ├── proveedor.routes.js
│   │   │   └── usuario.routes.js
│   │   │
│   │   ├── utils/
│   │   │   └── validators.js       # Funciones de validación reutilizables
│   │   │
│   │   ├── app.js                  # Configuración de Express y rutas
│   │   └── server.js               # Punto de entrada del servidor
│   │
│   ├── db/
│   │   └── init.sql                # Script de inicialización de la BD
│   │
│   ├── .env                        # Variables de entorno (no versionar)
│   ├── .env.example
│   └── package.json
│
├── frontend/                       # Aplicación web — React
│   ├── public/
│   └── src/
│       ├── api/                    # Instancia de Axios y llamadas a la API
│       ├── components/             # Componentes reutilizables (Navbar, etc.)
│       ├── context/                # Contextos globales (Auth, Carrito)
│       ├── pages/                  # Vistas principales de la app
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Catalogo.jsx
│       │   ├── Producto.jsx
│       │   ├── Carrito.jsx
│       │   ├── Checkout.jsx
│       │   ├── Pedidos.jsx
│       │   ├── PedidoDetalle.jsx
│       │   ├── Perfil.jsx
│       │   └── admin/
│       │       ├── Dashboard.jsx
│       │       ├── Productos.jsx
│       │       ├── Pedidos.jsx
│       │       └── Usuarios.jsx
│       ├── router/                 # Rutas protegidas por rol
│       ├── App.jsx
│       └── main.jsx
│   ├── .env
│   ├── .env.example
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

##  Requisitos Previos

- [Node.js](https://nodejs.org/) v18 o superior
- [npm](https://www.npmjs.com/) v8 o superior
- [MySQL](https://www.mysql.com/) v8 o superior
- Git

---

##  Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/mxfacil.git
cd mxfacil
```

### 2. Instalar dependencias del Backend

```bash
cd backend
npm install
```

### 3. Instalar dependencias del Frontend

```bash
cd ../frontend
npm install
```

### 4. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edita ambos archivos con tus valores (ver sección [Configuración](#-configuración)).

### 5. Inicializar la base de datos

```bash
mysql -u root -p < backend/db/init.sql
```

### 6. Iniciar el proyecto

Abre **dos terminales** en paralelo:

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# Disponible en http://localhost:3000

# Terminal 2 — Frontend
cd frontend
npm run dev
# Disponible en http://localhost:5173
```

---

##  Configuración

### Backend — `backend/.env`

```env
# Servidor
PORT=3000

# Base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=mxfacil

# Autenticación JWT
JWT_SECRET=tu_secreto_super_seguro
JWT_EXPIRES_IN=7d
```

### Frontend — `frontend/.env`

```env
# URL base de la API
VITE_API_URL=http://localhost:3000/api
```

>  **Importante:** Nunca subas los archivos `.env` a tu repositorio. Están incluidos en `.gitignore`.

---

##  Base de Datos

El script `backend/db/init.sql` crea y configura toda la base de datos en **tercera forma normal (3FN)**.

### Diagrama de tablas

```
usuario ─────┬─── direccion
             │
             └─── pedido ────┬─── pedido_item ─── producto ─── inventario
                             │                        │
                             │                    categoria
                             │                        │
                             │                    proveedor
                             ├─── pago
                             └─── envio
```

### Descripción de tablas

| Tabla | Descripción |
|---|---|
| `usuario` | Clientes, vendedores y administradores |
| `direccion` | Direcciones de envío por usuario |
| `proveedor` | Proveedores locales o dropshipping |
| `categoria` | Categorías de productos |
| `producto` | Catálogo de productos |
| `inventario` | Stock por producto (relación 1:1) |
| `pedido` | Órdenes de compra |
| `pedido_item` | Líneas de detalle de cada pedido |
| `pago` | Registro de pagos asociados a pedidos |
| `envio` | Datos de envío y rastreo |

---

##  Uso

### Verificar que la API está activa

```bash
curl http://localhost:3000/api/health
# { "status": "ok", "message": "mxfacil API up" }
```

### Registrar un usuario

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan","email":"juan@ejemplo.com","password":"segura123"}'
```

### Iniciar sesión

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@ejemplo.com","password":"segura123"}'
```

Usa el `token` de la respuesta en los endpoints protegidos:

```
Authorization: Bearer <tu_token_jwt>
```

---

##  Endpoints de la API

###  Autenticación — `/api/auth`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| POST | `/api/auth/register` | Registro de nuevo usuario | Público |
| POST | `/api/auth/login` | Inicio de sesión, retorna JWT | Público |

###  Usuario — `/api/usuario`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/usuario/me` | Obtener perfil propio | Autenticado |
| PUT | `/api/usuario/me` | Actualizar perfil propio | Autenticado |
| GET | `/api/usuario` | Listar todos los usuarios | Admin |
| PUT | `/api/usuario/:id` | Editar usuario por ID | Admin |
| DELETE | `/api/usuario/:id` | Eliminar usuario | Admin |

###  Direcciones — `/api/direcciones`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/direcciones` | Listar direcciones del usuario | Autenticado |
| POST | `/api/direcciones` | Agregar dirección | Autenticado |
| PUT | `/api/direcciones/:id` | Editar dirección | Autenticado |
| DELETE | `/api/direcciones/:id` | Eliminar dirección | Autenticado |

###  Categorías — `/api/categorias`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/categorias` | Listar todas las categorías | Público |
| POST | `/api/categorias` | Crear categoría | Admin |
| PUT | `/api/categorias/:id` | Editar categoría | Admin |
| DELETE | `/api/categorias/:id` | Eliminar categoría | Admin |

###  Proveedores — `/api/proveedores`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/proveedores` | Listar proveedores | Público |
| POST | `/api/proveedores` | Registrar proveedor | Admin |
| PUT | `/api/proveedores/:id` | Editar proveedor | Admin |
| DELETE | `/api/proveedores/:id` | Eliminar proveedor | Admin |

###  Productos — `/api/productos`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/productos` | Listar catálogo de productos | Público |
| GET | `/api/productos/:id` | Obtener producto por ID | Público |
| POST | `/api/productos` | Crear producto (con stock inicial) | Admin |
| PUT | `/api/productos/:id` | Editar producto | Admin |
| DELETE | `/api/productos/:id` | Eliminar producto | Admin |

###  Inventario — `/api/inventario`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/inventario/:productoId` | Ver stock de un producto | Público |
| PATCH | `/api/inventario/:productoId` | Actualizar stock | Admin |

###  Pedidos — `/api/pedidos`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/pedidos` | Listar pedidos propios | Autenticado |
| GET | `/api/pedidos/admin` | Listar todos los pedidos | Admin |
| GET | `/api/pedidos/:id` | Detalle completo de un pedido | Autenticado |
| POST | `/api/pedidos` | Crear nuevo pedido | Autenticado |
| PATCH | `/api/pedidos/:id/estado` | Cambiar estado del pedido | Admin |

###  Pagos — `/api/pagos`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/pagos/pedido/:pedidoId` | Ver pago de un pedido | Autenticado |
| PATCH | `/api/pagos/:id/estado` | Actualizar estado del pago | Admin |

###  Envíos — `/api/envios`

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/envios/pedido/:pedidoId` | Ver envío de un pedido | Autenticado |
| PATCH | `/api/envios/:id` | Actualizar datos del envío | Admin |

---

##  Vistas del Frontend

La aplicación React está dividida en vistas públicas, vistas de cliente autenticado y panel de administración.

### Públicas

| Vista | Ruta | Descripción |
|---|---|---|
| Login | `/login` | Inicio de sesión con email y contraseña |
| Registro | `/register` | Creación de nueva cuenta de usuario |
| Catálogo | `/` | Listado de productos con filtro por categoría |
| Detalle de producto | `/productos/:id` | Información completa y botón de agregar al carrito |

### Cliente (requiere sesión)

| Vista | Ruta | Descripción |
|---|---|---|
| Carrito | `/carrito` | Productos agregados y resumen de compra |
| Checkout | `/checkout` | Selección de dirección y método de pago |
| Mis pedidos | `/pedidos` | Historial de pedidos del usuario |
| Detalle de pedido | `/pedidos/:id` | Estado, items, pago y seguimiento del envío |
| Perfil | `/perfil` | Edición de datos personales y direcciones guardadas |

### Administración (requiere rol `admin`)

| Vista | Ruta | Descripción |
|---|---|---|
| Dashboard | `/admin` | Resumen general del sistema |
| Gestión de productos | `/admin/productos` | CRUD de productos e inventario |
| Gestión de pedidos | `/admin/pedidos` | Ver y actualizar estado de todos los pedidos |
| Gestión de usuarios | `/admin/usuarios` | Ver, editar y eliminar usuarios |

> Las rutas de cliente y administración están protegidas mediante **React Router** con componentes de ruta privada que verifican el token JWT y el rol del usuario almacenados en el contexto de autenticación.

---

##  Roles y Permisos

| Rol | Descripción | Permisos |
|---|---|---|
| `cliente` | Comprador final | Ver catálogo, agregar al carrito, crear pedidos, gestionar su perfil y direcciones, ver sus pagos y envíos |
| `vendedor` | Comerciante registrado | Mismos permisos que cliente (extensible a futuro) |
| `admin` | Administrador del sistema | Acceso completo: gestión de productos, categorías, proveedores, inventario, pedidos, pagos, envíos y usuarios |

### Autenticación

Todos los endpoints protegidos requieren el header:

```
Authorization: Bearer <JWT_TOKEN>
```

El token se obtiene al hacer login y tiene una validez configurable mediante `JWT_EXPIRES_IN` en el `.env` del backend (por defecto 7 días). El frontend lo almacena y lo adjunta automáticamente a cada petición mediante un interceptor de Axios.
