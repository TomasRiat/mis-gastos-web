// auth.js — usuarios: registro, login, sesión y el middleware requiereLogin
import { Router } from "express";
import { hashearClave, verificarClave } from "./claves.js";
import { db } from "./db.js";

const CLAVE_MINIMA = 8;
const CLAVE_CORTA =
  `La contraseña tiene que tener al menos ${CLAVE_MINIMA} caracteres.`;

// Un Router es un grupo de rutas que después se «enchufa» a la app (en app.js)
export const rutasUsuarios = Router();

// Middleware: la ruta solo sigue si hay una sesión iniciada; si no, 401
export function requiereLogin(req, res, next) {
  if (req.session.usuarioId === undefined) {
    return res.status(401).json({ error: "Tenés que iniciar sesión." });
  }
  next();                                 // hay sesión: sigue la ruta
}

// Saca email y clave del JSON. El email, sin espacios y en minúsculas
function leerEmailYClave(req) {
  const datos = req.body ?? {};           // sin JSON, req.body es undefined
  const email = String(datos.email ?? "").trim().toLowerCase();
  const clave = String(datos.clave ?? "");
  return { email, clave };
}

function iniciarSesion(req, usuarioId) {
  req.session = { usuarioId };    // reemplaza la sesión anterior; viaja en la cookie
}

rutasUsuarios.post("/api/registro", async (req, res) => {
  const { email, clave } = leerEmailYClave(req);
  if (!email.includes("@") || email.length > 120) {
    return res.status(400).json({ error: "Escribí un email válido." });
  }
  if (clave.length < CLAVE_MINIMA) {
    return res.status(400).json({ error: CLAVE_CORTA });
  }
  const existente = await db.execute({
    sql: "SELECT id FROM usuarios WHERE email = ?",
    args: [email],
  });
  if (existente.rows.length > 0) {
    return res.status(409).json({ error: "Ya hay una cuenta con ese email." });
  }
  const hash = await hashearClave(clave);          // la clave nunca se guarda tal cual
  const resultado = await db.execute({
    sql: "INSERT INTO usuarios (email, hash_clave, creado) VALUES (?, ?, ?)",
    args: [email, hash, new Date().toISOString()],
  });
  const id = Number(resultado.lastInsertRowid);
  iniciarSesion(req, id);                 // recién registrado = ya adentro
  res.status(201).json({ id, email });
});

rutasUsuarios.post("/api/login", async (req, res) => {
  const { email, clave } = leerEmailYClave(req);
  const resultado = await db.execute({
    sql: "SELECT id, hash_clave FROM usuarios WHERE email = ?",
    args: [email],
  });
  const usuario = resultado.rows[0];      // undefined si no hay cuenta con ese email
  // el mismo mensaje en los dos casos: así nadie averigua qué emails tienen cuenta
  if (usuario === undefined || !(await verificarClave(clave, usuario.hash_clave))) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }
  iniciarSesion(req, usuario.id);
  res.json({ id: usuario.id, email });
});

rutasUsuarios.post("/api/logout", (req, res) => {
  req.session = null;                     // null borra la cookie de sesión
  res.status(204).end();
});

// Cambiar la contraseña: hay que saber la actual (por si alguien usa tu compu abierta)
rutasUsuarios.post("/api/clave", requiereLogin, async (req, res) => {
  const datos = req.body ?? {};
  const actual = String(datos.actual ?? "");
  const nueva = String(datos.nueva ?? "");
  const usuarioId = req.session.usuarioId;
  const resultado = await db.execute({
    sql: "SELECT hash_clave FROM usuarios WHERE id = ?",
    args: [usuarioId],
  });
  const usuario = resultado.rows[0];
  if (usuario === undefined || !(await verificarClave(actual, usuario.hash_clave))) {
    return res.status(400).json({ error: "La contraseña actual no es correcta." });
  }
  if (nueva.length < CLAVE_MINIMA) {
    return res.status(400).json({ error: CLAVE_CORTA });
  }
  const hash = await hashearClave(nueva);
  await db.execute({
    sql: "UPDATE usuarios SET hash_clave = ? WHERE id = ?",
    args: [hash, usuarioId],
  });
  res.json({ mensaje: "Listo: cambiaste tu contraseña." });
});

rutasUsuarios.get("/api/yo", requiereLogin, async (req, res) => {
  const resultado = await db.execute({
    sql: "SELECT id, email FROM usuarios WHERE id = ?",
    args: [req.session.usuarioId],
  });
  if (resultado.rows.length === 0) {      // la cookie es de un usuario que ya no existe
    req.session = null;
    return res.status(401).json({ error: "Tenés que iniciar sesión." });
  }
  res.json(resultado.rows[0]);
});
