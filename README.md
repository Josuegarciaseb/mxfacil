# Comercio Fácil México

## Descripción del Proyecto

**Comercio Fácil México** es una plataforma digital de comercio electrónico desarrollada como proyecto académico, cuyo objetivo es **facilitar la conexión entre proveedores y pequeños comerciantes en México**, simplificando el proceso de compra, venta y seguimiento de pedidos.

La plataforma está pensada para pequeños negocios como tienditas, puestos de tianguis, comerciantes ambulantes y emprendedores, quienes suelen enfrentar dificultades al adquirir productos al por mayor o tratar con intermediarios. Comercio Fácil México busca reducir estas barreras mediante una solución tecnológica sencilla, accesible y centralizada.

---

## Objetivo General

Desarrollar una plataforma digital que permita la intermediación comercial entre proveedores y pequeños comerciantes en México, facilitando la gestión de productos, pedidos y seguimiento de compras de manera clara y eficiente.

---

## Objetivos Específicos

- Permitir a los comerciantes consultar productos disponibles de distintos proveedores.
- Facilitar la realización de pedidos al por mayor desde una sola plataforma.
- Ofrecer seguimiento del estado de los pedidos en tiempo real.
- Centralizar la información de compras y pedidos de los usuarios.
- Proporcionar una interfaz intuitiva y fácil de usar.

---

## Alcance del Proyecto

El proyecto contempla:

- Plataforma web accesible desde navegador.
- Gestión de usuarios (proveedores y comerciantes).
- Catálogo de productos.
- Registro y seguimiento de pedidos.
- Comunicación básica entre proveedor y cliente.
- Base de datos para almacenamiento de información.

Quedan fuera del alcance, en esta etapa:
- Procesamiento de pagos en línea.
- Integraciones con servicios de paquetería externos.
- Aplicación móvil nativa.

---

## Tecnologías Utilizadas

- **Backend:** Node.js con Express  
- **Base de Datos:** MySQL  
- **Frontend:** Aplicación web (HTML, CSS, JavaScript / framework en desarrollo)  


---

## Estructura del Proyecto

```bash
comercio-facil-mexico/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middlewares/
│   │   └── config/
│   ├── app.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   └── src/
│
├── database/
│   └── scripts.sql
│
├── docs/
│   └── projectlibre/
│
├── .env.example
├── .gitignore
└── README.md
