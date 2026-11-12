# Vista previa del vendedor

Abre `vistas-previas/panel-vendedor.html` en un navegador. Es un archivo autónomo: contiene la interfaz, las imágenes y los datos ficticios del 12 de noviembre de 2026. No requiere iniciar sesión, levantar la API ni conectarse a internet.

El prototipo utiliza los componentes del catálogo y del perfil público de Comercio Fácil. Sólo para esta compilación, las consultas de esos componentes se resuelven con los datos de ejemplo. El carrito, la dirección elegida y los pedidos simulados se conservan en la pestaña, separados de la tienda real.

Para regenerar el archivo desde la raíz, con las dependencias del frontend instaladas:

```powershell
node frontend/vista-vendedor/compilar.mjs
```

También puedes servirlo en esta computadora:

```powershell
node frontend/vista-vendedor/servir.mjs
```
