// app.js — Mis Gastos web · etapa 12.6: arma la app con las piezas de cada archivo
//   db.js   → la base de datos        auth.js   → usuarios y sesión
//   api.js  → la API de gastos        claves.js → el hash de las contraseñas
//   app.js  → configuración, errores y arranque
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import cookieSession from "cookie-session";
import express from "express";
import { rutasGastos } from "./api.js";
import { rutasUsuarios } from "./auth.js";
import { CARPETA, CARPETA_DATOS, crearTablas } from "./db.js";

const app = express();
const PUERTO = process.env.PORT ?? 4000;   // en Render, el que elija Render
const PRODUCCION = process.env.PRODUCCION === "1";   // "1" solo en Render

// Publicada, la clave y la base NO pueden vivir en el disco de Render (se borra cada
// vez que la app se reinicia o se duerme): tienen que llegar en variables de entorno
if (PRODUCCION) {
  for (const nombre of ["SESSION_SECRET", "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"]) {
    if (!process.env[nombre]) throw new Error(`Falta la variable de entorno ${nombre}`);
  }
}

// La clave que firma la cookie de sesión: de la variable de entorno SESSION_SECRET
// o, si no está, de datos/clave-secreta.txt (se crea sola la primera vez)
function leerClaveSecreta() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const archivo = join(CARPETA_DATOS, "clave-secreta.txt");
  if (!existsSync(archivo)) {
    writeFileSync(archivo, randomBytes(32).toString("hex"));   // 64 caracteres al azar
  }
  return readFileSync(archivo, "utf8");
}

// En Render, el HTTPS lo atiende un «proxy» que le pasa el pedido a la app: con esto,
// Express le cree cuando avisa que el pedido llegó cifrado (y la cookie secure viaja)
app.set("trust proxy", 1);

app.use(express.static(join(CARPETA, "static")));   // el frontend
// El cuerpo JSON queda en req.body (hasta 1 MB: importar manda la lista entera)
app.use(express.json({ limit: "1mb" }));
// La sesión viaja en una cookie firmada (req.session se usa como un objeto).
// JavaScript no la puede leer (httpOnly), no viaja en pedidos que empiezan en otra
// página (sameSite: "lax") y, publicada, solo viaja por HTTPS (secure)
app.use(cookieSession({
  keys: [leerClaveSecreta()],
  httpOnly: true,
  sameSite: "lax",
  secure: PRODUCCION,
}));
app.set("json spaces", 2);           // JSON con sangría: se lee mejor en la terminal

// ---------------------------------------------------------------- CSRF
// Otra página podría tener un <form> que mande un pedido a tu API con tu cookie.
// Dos llaves lo frenan: sameSite (el navegador no manda la cookie) y exigir JSON
// (un <form> no puede mandar JSON, y fetch desde otro sitio no puede sin permiso CORS)
function soloJson(req, res, next) {
  const cambiaAlgo = ["POST", "PUT", "DELETE"].includes(req.method);
  const tipo = req.get("Content-Type") ?? "";      // la cabecera, aunque no haya cuerpo
  if (cambiaAlgo && !tipo.startsWith("application/json")) {
    return res.status(415).json({ error: "La API solo acepta JSON." });
  }
  next();
}

app.use("/api", soloJson);       // antes de todas las rutas de la API

// ---------------------------------------------------------------- rutas
app.use(rutasUsuarios);          // /api/registro, /api/login, /api/yo…
app.use(rutasGastos);            // /api/gastos…

await crearTablas();     // al arrancar: si las tablas ya existen, no hace nada

// ---------------------------------------------------------------- errores
// En /api/... el navegador espera JSON, también cuando algo sale mal.
// Si ninguna ruta respondió: 404 en JSON
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Esa dirección no existe en la API." });
});

// Fuera de la API, una página amable con el estilo de la app
app.use((req, res) => {
  res.status(404).sendFile(join(CARPETA, "static", "404.html"));
});

// Con 4 parámetros, Express sabe que es para errores: le llegan las excepciones
app.use("/api", (error, req, res, next) => {
  if (error.type === "entity.parse.failed") {      // express.json() no lo entendió
    return res.status(400).json({ error: "Lo que mandaste no es un JSON válido." });
  }
  console.error(error);                            // el detalle, solo en tu terminal
  res.status(500).json({ error: "Algo falló en el servidor. Probá de nuevo." });
});

app.listen(PUERTO, (error) => {
  if (error) throw error;          // por ejemplo, si el puerto ya está ocupado
  console.log(`Mis Gastos en http://localhost:${PUERTO}`);
});
