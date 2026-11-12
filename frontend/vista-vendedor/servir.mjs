import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

// El único recurso servido es el prototipo autocontenido.
const archivo = new URL("../../vistas-previas/panel-vendedor.html", import.meta.url);
const servidor = createServer(async (req, res) => {
  if (!["/", "/panel-vendedor.html"].includes(req.url?.split("?")[0]) || !["GET","HEAD"].includes(req.method)) {
    res.writeHead(404).end();return;
  }
  try {
    const html = await readFile(archivo);
    res.writeHead(200, { "Content-Type":"text/html; charset=utf-8", "Cache-Control":"no-store" }).end(req.method === "HEAD" ? undefined : html);
  } catch { res.writeHead(503, { "Content-Type":"text/plain; charset=utf-8" }).end("Compila primero la vista previa."); }
});
const puerto = Number(process.argv[2] || 5186);
servidor.listen(puerto, "127.0.0.1", () => console.log("Vista previa: http://127.0.0.1:" + puerto + "/"));
