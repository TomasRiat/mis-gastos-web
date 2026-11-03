// almacen.js — guardar y leer los gastos en el servidor (la API de Express)
const URL_API = "/api/gastos";
// Todo pedido que cambia algo va como JSON: el servidor rechaza lo demás (CSRF, cap. 10)
const JSON_CABECERAS = { "Content-Type": "application/json" };

// Si el servidor respondió con un error (400, 404, 500…), lo lanza con su mensaje
async function leerRespuesta(respuesta) {
  if (respuesta.status === 401) {
    location.href = "/login.html";               // sin sesión: a la pantalla de entrar
  }
  if (respuesta.status === 204) return null;     // 204: salió bien y no trae datos
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    const detalles = datos.detalles ? " " + datos.detalles.join(" ") : "";
    throw new Error(datos.error + detalles);
  }
  return datos;
}

// Quién está usando la app: { id, email }
export async function traerUsuario() {
  const respuesta = await fetch("/api/yo");
  return await leerRespuesta(respuesta);
}

export async function cerrarSesion() {
  const respuesta = await fetch("/api/logout", { method: "POST", headers: JSON_CABECERAS });
  await leerRespuesta(respuesta);
}

// Pide la lista al servidor
export async function cargarGastos() {
  const respuesta = await fetch(URL_API);
  return await leerRespuesta(respuesta);
}

// Manda un gasto nuevo; el servidor le pone el id y lo devuelve completo
export async function agregarGasto(datos) {
  const respuesta = await fetch(URL_API, {
    method: "POST",
    headers: JSON_CABECERAS,
    body: JSON.stringify(datos),
  });
  return await leerRespuesta(respuesta);
}

// Reemplaza los datos del gasto con ese id y devuelve cómo quedó
export async function editarGasto(id, datos) {
  const respuesta = await fetch(`${URL_API}/${id}`, {
    method: "PUT",
    headers: JSON_CABECERAS,
    body: JSON.stringify(datos),
  });
  return await leerRespuesta(respuesta);
}

// Borra el gasto con ese id (el servidor responde 204, sin datos)
export async function borrarGasto(id) {
  const respuesta = await fetch(`${URL_API}/${id}`, { method: "DELETE", headers: JSON_CABECERAS });
  await leerRespuesta(respuesta);
}

// Manda la lista entera en un solo pedido; el servidor dice cuántos guardó
export async function importarGastos(lista) {
  const respuesta = await fetch(`${URL_API}/importar`, {
    method: "POST",
    headers: JSON_CABECERAS,
    body: JSON.stringify(lista),
  });
  return await leerRespuesta(respuesta);
}

// Baja la lista como archivo .json (una copia de seguridad que podés mover a otra compu)
export function exportarGastos(lista) {
  const texto = JSON.stringify(lista, null, 2);
  const archivo = new Blob([texto], { type: "application/json" });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  const hoy = new Date().toLocaleDateString("sv-SE");   // fecha local, AAAA-MM-DD
  enlace.download = `mis-gastos-${hoy}.json`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Lee un archivo elegido con <input type="file"> y lo convierte de JSON a datos
export async function leerArchivo(archivo) {
  const texto = await archivo.text();
  return JSON.parse(texto);
}
