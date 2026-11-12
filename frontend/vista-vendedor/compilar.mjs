import { build } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const carpeta = dirname(fileURLToPath(import.meta.url));
const publico = resolve(carpeta, "../public");
const salida = resolve(carpeta, "../../vistas-previas");
const imagen = async (ruta, mime) => "data:" + mime + ";base64," + (await readFile(join(publico, ruta))).toString("base64");
const assets = new Map(await Promise.all([
  ["logo.svg", "image/svg+xml"], ["catalogo/productos-del-campo.jpg", "image/jpeg"], ["catalogo/cosecha.jpg", "image/jpeg"],
].map(async ([ruta, tipo]) => ["/" + ruta, await imagen(ruta, tipo)])));
const resultado = await build({
  root: carpeta, configFile: false, envDir: false, publicDir: publico, plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  resolve: { alias: [{ find: /^(?:\.\.\/\.\.\/utils\/api|\.\/api)$/, replacement: join(carpeta, "datos.js") }] },
  build: { write: false, target: "es2020", lib: { entry: join(carpeta, "Preview.jsx"), name: "VistaVendedor", formats: ["iife"] } },
});
const archivos = (Array.isArray(resultado) ? resultado : [resultado]).flatMap(r => r.output);
const inline = s => { for (const [ruta, data] of assets) s = s.replaceAll(ruta, data); return s; };
const js = inline(archivos.find(a=>a.type === "chunk").code).replace(/<\/script/gi, "<\\/script");
const css = inline(archivos.find(a=>a.fileName.endsWith(".css")).source);
const pagina = `<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="theme-color" content="#193b2b">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>Panel de ventas · Comercio Fácil · Vista previa</title><link rel="icon" href="${assets.get("/logo.svg")}"><style>${css}</style></head>
<body class="portal-vendedor"><div id="root"></div><noscript>Activa JavaScript para recorrer esta vista previa.</noscript><script>${js}</script></body></html>`;
await mkdir(salida, { recursive: true });
await writeFile(join(salida, "panel-vendedor.html"), pagina);
console.log("Vista previa lista: " + join(salida, "panel-vendedor.html"));
