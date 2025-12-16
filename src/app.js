const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const direccionRoutes = require('./routes/direccion.routes');
const proveedorRoutes = require('./routes/proveedor.routes');
const categoriaRoutes = require('./routes/categorias.routes');
const productoRoutes = require('./routes/producto.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const pedidoRoutes = require('./routes/pedido.routes');
const pagoRoutes = require('./routes/pago.routes');
const envioRoutes = require('./routes/envio.routes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/direcciones', direccionRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/envios', envioRoutes);

//API health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'mxfacil API up' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
