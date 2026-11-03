// api.js — la API de gastos: validar y guardar, siempre del usuario de la sesión
import { Router } from "express";
import { requiereLogin } from "./auth.js";
import { db } from "./db.js";
import { CATEGORIAS } from "./static/js/gastos.js";   // las mismas del formulario

const MONTO_MAXIMO = 100_000_000;

export const rutasGastos = Router();

// ---------------------------------------------------------------- validación
// true si el texto es una fecha que existe, escrita AAAA-MM-DD
function esFecha(texto) {
  if (typeof texto !== "string" || texto.length !== 10) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);     // "28/10/2026" da Invalid Date
  if (Number.isNaN(fecha.getTime())) return false;
  // "2026-02-30" se corre al 2 de marzo: si al volver a texto cambió, no existía
  return fecha.toISOString().slice(0, 10) === texto;
}

// Revisa lo que mandó el navegador. Devuelve la lista de errores (vacía = está bien)
function validarGasto(datos) {
  if (typeof datos !== "object" || datos === null || Array.isArray(datos)) {
    return ["Mandá el gasto como un objeto JSON."];
  }
  const errores = [];
  if (!esFecha(datos.fecha)) {
    errores.push("La fecha tiene que ser una fecha real con la forma AAAA-MM-DD.");
  }
  if (!Object.hasOwn(CATEGORIAS, String(datos.categoria))) {
    const lista = Object.keys(CATEGORIAS).join(", ");
    errores.push(`La categoría tiene que ser una de: ${lista}.`);
  }
  const monto = datos.monto;
  // typeof: "8500" (texto) o true no pasan como números
  if (typeof monto !== "number" || !(monto > 0 && monto <= MONTO_MAXIMO)) {
    errores.push("El monto tiene que ser un número mayor que 0 " +
                 "y de hasta 100.000.000.");
  }
  const descripcion = datos.descripcion;
  const largo = typeof descripcion === "string" ? descripcion.trim().length : 0;
  if (largo < 1 || largo > 100) {
    errores.push("La descripción tiene que tener entre 1 y 100 caracteres.");
  }
  return errores;
}

function respuestaInvalida(res, errores) {
  res.status(400).json({ error: "Revisá los datos del gasto.", detalles: errores });
}

// El gasto con ese id, si es de ese usuario; si no, undefined
async function buscar(id, usuarioId) {
  const resultado = await db.execute({
    sql: "SELECT id, fecha, categoria, monto, descripcion FROM gastos " +
         "WHERE id = ? AND usuario_id = ?",
    args: [id, usuarioId],
  });
  return resultado.rows[0];          // la primera fila (undefined si no vino ninguna)
}

// 8500 → "8500" · 1234.5 → "1234,5" (Excel en español usa coma decimal)
function montoParaExcel(monto) {
  return String(Math.round(monto * 100) / 100).replace(".", ",");
}

// Con ; comillas o saltos de línea, el texto va entre comillas (y cada " se duplica)
function celdaCsv(texto) {
  if (!/[;"\r\n]/.test(texto)) return texto;
  return `"${texto.replaceAll('"', '""')}"`;
}

// ---------------------------------------------------------------- rutas
rutasGastos.get("/api/gastos", requiereLogin, async (req, res) => {
  // El WHERE se arma con partes FIJAS; los valores van siempre aparte, con ?
  let sql = "SELECT id, fecha, categoria, monto, descripcion FROM gastos " +
            "WHERE usuario_id = ?";
  const args = [req.session.usuarioId];
  const mes = req.query.mes ?? "";                  // ?mes=2026-10
  const categoria = req.query.categoria ?? "";      // ?categoria=comida
  if (mes) {
    sql += " AND substr(fecha, 1, 7) = ?";          // "2026-10-28" → "2026-10"
    args.push(mes);
  }
  if (categoria) {
    sql += " AND categoria = ?";
    args.push(categoria);
  }
  sql += " ORDER BY fecha DESC, id DESC";
  const resultado = await db.execute({ sql, args });
  res.json(resultado.rows);
});

// Todos tus gastos en un CSV que Excel abre con doble clic
rutasGastos.get("/api/gastos.csv", requiereLogin, async (req, res) => {
  const resultado = await db.execute({
    sql: "SELECT fecha, categoria, monto, descripcion FROM gastos " +
         "WHERE usuario_id = ? ORDER BY fecha, id",
    args: [req.session.usuarioId],
  });
  const lineas = ["fecha;categoria;monto;descripcion"];   // ; como espera Excel
  for (const fila of resultado.rows) {
    const celdas = [fila.fecha, fila.categoria, montoParaExcel(fila.monto),
                    celdaCsv(fila.descripcion)];
    lineas.push(celdas.join(";"));
  }
  const hoy = new Date().toLocaleDateString("sv-SE");   // fecha local, AAAA-MM-DD
  res.attachment(`mis-gastos-${hoy}.csv`);    // «bajalo como archivo», y es text/csv
  // BOM (\ufeff): le avisa a Excel que es UTF-8 · \r\n: el fin de línea de Windows
  res.send("\ufeff" + lineas.join("\r\n") + "\r\n");
});

// Cuánto se gastó por categoría: la base suma y cuenta con GROUP BY
rutasGastos.get("/api/resumen", requiereLogin, async (req, res) => {
  let sql = "SELECT categoria, SUM(monto) AS total, COUNT(*) AS cantidad " +
            "FROM gastos WHERE usuario_id = ?";
  const args = [req.session.usuarioId];
  const mes = req.query.mes ?? "";                  // ?mes=2026-10 (opcional)
  if (mes) {
    sql += " AND substr(fecha, 1, 7) = ?";
    args.push(mes);
  }
  sql += " GROUP BY categoria ORDER BY total DESC, categoria";
  const resultado = await db.execute({ sql, args });
  let total = 0;
  for (const fila of resultado.rows) {
    total += fila.total;
  }
  const categorias = resultado.rows.map((fila) => ({
    categoria: fila.categoria,
    total: fila.total,
    cantidad: fila.cantidad,
    porcentaje: Math.round((fila.total * 100) / total),
  }));
  res.json({ total, categorias });
});

rutasGastos.get("/api/gastos/:id", requiereLogin, async (req, res) => {
  const gasto = await buscar(req.params.id, req.session.usuarioId);
  if (gasto === undefined) {
    return res.status(404).json({ error: "No existe ese gasto." });
  }
  res.json(gasto);
});

rutasGastos.post("/api/gastos", requiereLogin, async (req, res) => {
  const datos = req.body;                 // undefined si no vino JSON
  const errores = validarGasto(datos);
  if (errores.length > 0) {
    return respuestaInvalida(res, errores);
  }
  const usuarioId = req.session.usuarioId;       // de la sesión, nunca del JSON
  const resultado = await db.execute({
    sql: "INSERT INTO gastos (usuario_id, fecha, categoria, monto, descripcion) " +
         "VALUES (?, ?, ?, ?, ?)",
    args: [usuarioId, datos.fecha, datos.categoria, datos.monto,
           datos.descripcion.trim()],
  });
  const id = Number(resultado.lastInsertRowid);   // BigInt (4n) → 4
  res.status(201).json(await buscar(id, usuarioId));
});

rutasGastos.put("/api/gastos/:id", requiereLogin, async (req, res) => {
  const datos = req.body;
  const errores = validarGasto(datos);
  if (errores.length > 0) {
    return respuestaInvalida(res, errores);
  }
  const usuarioId = req.session.usuarioId;
  const resultado = await db.execute({
    sql: "UPDATE gastos SET fecha = ?, categoria = ?, monto = ?, descripcion = ? " +
         "WHERE id = ? AND usuario_id = ?",
    args: [datos.fecha, datos.categoria, datos.monto, datos.descripcion.trim(),
           req.params.id, usuarioId],
  });
  if (resultado.rowsAffected === 0) {     // no existe o es de otro usuario: lo mismo
    return res.status(404).json({ error: "No existe ese gasto." });
  }
  res.json(await buscar(req.params.id, usuarioId));
});

rutasGastos.delete("/api/gastos/:id", requiereLogin, async (req, res) => {
  const resultado = await db.execute({
    sql: "DELETE FROM gastos WHERE id = ? AND usuario_id = ?",
    args: [req.params.id, req.session.usuarioId],
  });
  if (resultado.rowsAffected === 0) {
    return res.status(404).json({ error: "No existe ese gasto." });
  }
  res.status(204).end();
});

// Recibe la lista que exportaste desde la versión del navegador (Exportar JSON)
rutasGastos.post("/api/gastos/importar", requiereLogin, async (req, res) => {
  const lista = req.body;
  if (!Array.isArray(lista)) {
    return res.status(400).json({ error: "Mandá una lista de gastos." });
  }
  const usuarioId = req.session.usuarioId;
  const inserciones = [];
  for (const [i, gasto] of lista.entries()) {   // i: 0, 1, 2…
    const errores = validarGasto(gasto);
    if (errores.length > 0) {                  // uno malo frena todo: no entra ninguno
      return res.status(400).json({
        error: `El gasto ${i + 1} de la lista tiene errores.`,
        detalles: errores,
      });
    }
    inserciones.push({
      sql: "INSERT INTO gastos (usuario_id, fecha, categoria, monto, descripcion) " +
           "VALUES (?, ?, ?, ?, ?)",
      args: [usuarioId, gasto.fecha, gasto.categoria, gasto.monto,
             gasto.descripcion.trim()],
    });
  }
  // batch: todas juntas, en una sola transacción (o entran todas o ninguna)
  await db.batch(inserciones, "write");
  res.status(201).json({ importados: inserciones.length });
});
