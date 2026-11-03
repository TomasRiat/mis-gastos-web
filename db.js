// db.js — la base de datos: dónde está, cómo conectarse y qué tablas tiene
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

// Rutas a partir de la carpeta de ESTE archivo: funcionan igual en tu compu y en el
// servidor, sin importar desde qué carpeta se arranque la app
export const CARPETA = import.meta.dirname;
export const CARPETA_DATOS = join(CARPETA, "datos");
mkdirSync(CARPETA_DATOS, { recursive: true });   // acá van la base y la clave secreta

// En tu compu, el archivo datos/gastos.db; publicada, la base de Turso (mismo código)
export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? `file:${join(CARPETA_DATOS, "gastos.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,       // en tu compu no hace falta
});
await db.execute("PRAGMA foreign_keys = ON");    // que SQLite cuide las FOREIGN KEY

export async function crearTablas() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          INTEGER PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      hash_clave  TEXT NOT NULL,
      creado      TEXT NOT NULL
    )`);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gastos (
      id          INTEGER PRIMARY KEY,
      usuario_id  INTEGER NOT NULL,
      fecha       TEXT NOT NULL,
      categoria   TEXT NOT NULL,
      monto       REAL NOT NULL,
      descripcion TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    )`);
}
