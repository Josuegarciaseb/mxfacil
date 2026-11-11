# MX Facil: arranque local

Desde esta carpeta en PowerShell:

```powershell
npm.cmd run db:check
npm.cmd run dev
```

Abre http://localhost:5173. La API usa http://localhost:3000/api.
Ctrl+C detiene ambos servicios. Para recarga automatica del backend, puedes
usar por separado `npm.cmd --prefix backend run dev` y
`npm.cmd --prefix frontend run dev`.

## Configuracion de MySQL

Completa `DB_HOST`, `DB_PORT`, `DB_USER` y `DB_PASS` en `backend/.env`.
`DB_NAME` es `mxfacil`. Para una base nueva y vacia:

```powershell
npm.cmd run db:init
```

El inicializador rechaza bases que ya tienen tablas para conservar los datos.
Las bases existentes pueden requerir las migraciones de `backend/migrations`.
Los archivos `.env` contienen secretos locales y estan excluidos de Git.

## Verificaciones

```powershell
npm.cmd run build
npm.cmd run test:frontend
```

Las pruebas del backend requieren su MySQL aislado en el puerto 3318,
como define `backend/test/helpers.js`.
Google y las pasarelas de pago requieren sus propias credenciales para funcionar.

Si necesitas reinstalar las dependencias:

```powershell
npm.cmd --prefix backend ci
npm.cmd --prefix frontend ci
```
