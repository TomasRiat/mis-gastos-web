// vista.js — todo lo que se dibuja en la pantalla
import { CATEGORIAS, calcularTotal } from "./gastos.js";

const lista = document.querySelector("#lista");
const total = document.querySelector("#total");
const vacio = document.querySelector("#vacio");
const totalUsd = document.querySelector("#total-usd");
const cotizacion = document.querySelector("#cotizacion");
const contador = document.querySelector("#contador");
const resumen = document.querySelector("#resumen");
const formulario = document.querySelector("#form-gasto");
const tituloFormulario = document.querySelector("#titulo-form");
const botonGuardar = document.querySelector("#guardar");
const botonCancelar = document.querySelector("#cancelar");
const mensaje = document.querySelector("#mensaje-copia");
const mensajeError = document.querySelector("#mensaje");
const emailUsuario = document.querySelector("#email-usuario");
const mensajeCuenta = document.querySelector("#mensaje-cuenta");

export function formatearPesos(numero) {
  return "$ " + numero.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export function formatearDolares(numero) {
  return "US$ " + numero.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "2026-10-28" → "28/10/2026"
export function formatearFecha(fecha) {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

function crearCelda(texto, clase) {
  const celda = document.createElement("td");
  celda.textContent = texto;
  if (clase) celda.classList.add(clase);
  return celda;
}

function crearBoton(texto, clase, id) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = clase;
  boton.textContent = texto;
  boton.dataset.id = id;
  return boton;
}

function crearFila(gasto) {
  const fila = document.createElement("tr");
  const acciones = crearCelda("", "acciones");
  acciones.append(crearBoton("Editar", "editar", gasto.id), crearBoton("Borrar", "borrar", gasto.id));
  fila.append(
    crearCelda(formatearFecha(gasto.fecha)),
    crearCelda(CATEGORIAS[gasto.categoria]),
    crearCelda(gasto.descripcion),
    crearCelda(formatearPesos(gasto.monto), "monto"),
    acciones,
  );
  return fila;
}

export function mostrarGastos(gastos) {
  lista.replaceChildren(...gastos.map(crearFila));
  total.textContent = formatearPesos(calcularTotal(gastos));
  vacio.hidden = gastos.length > 0;
  contador.textContent = gastos.length === 1 ? "1 gasto" : `${gastos.length} gastos`;
}

export function mostrarDolares(gastos, dolar) {
  totalUsd.textContent = formatearDolares(calcularTotal(gastos) / dolar.venta);
  const fecha = new Date(dolar.fechaActualizacion).toLocaleDateString("es-AR");
  const origen = dolar.respaldo ? "cotización guardada" : "DolarAPI";
  cotizacion.textContent = `Blue a ${formatearPesos(dolar.venta)} · ${fecha} · ${origen}`;
}

export function dolarNoDisponible() {
  totalUsd.textContent = "no disponible";
}

// Cada categoría es un <li> con su nombre, una barra y el monto (las cuentas vienen del servidor)
export function mostrarResumen(datosResumen) {
  const items = datosResumen.categorias.map((dato) => {
    const item = document.createElement("li");
    const nombre = document.createElement("span");
    nombre.className = "resumen-nombre";
    nombre.textContent = CATEGORIAS[dato.categoria];
    const barra = document.createElement("div");
    barra.className = "barra";
    const relleno = document.createElement("div");
    relleno.className = "barra-relleno";
    relleno.style.width = `${dato.porcentaje}%`;   // el CSS dibuja; JS solo dice cuánto
    barra.append(relleno);
    const monto = document.createElement("span");
    monto.className = "resumen-monto";
    const cantidad = dato.cantidad === 1 ? "1 gasto" : `${dato.cantidad} gastos`;
    monto.textContent = `${formatearPesos(dato.total)} · ${dato.porcentaje} % · ${cantidad}`;
    item.append(nombre, barra, monto);
    return item;
  });
  resumen.replaceChildren(...items);
}

// Pasa los datos de un gasto al formulario para cambiarlos
export function llenarFormulario(gasto) {
  formulario.elements.fecha.value = gasto.fecha;
  formulario.elements.categoria.value = gasto.categoria;
  formulario.elements.monto.value = gasto.monto;
  formulario.elements.descripcion.value = gasto.descripcion;
  formulario.scrollIntoView({ behavior: "smooth" });
}

// true: el formulario edita un gasto · false: vuelve a «Nuevo gasto»
export function modoEdicion(activo) {
  tituloFormulario.textContent = activo ? "Editar gasto" : "Nuevo gasto";
  botonGuardar.textContent = activo ? "Guardar cambios" : "Agregar";
  botonCancelar.hidden = !activo;
  formulario.classList.toggle("editando", activo);
}

export function mostrarMensaje(texto) {
  mensaje.textContent = texto;
}

export function mostrarUsuario(email) {
  emailUsuario.textContent = email;
}

export function mostrarMensajeCuenta(texto) {
  mensajeCuenta.textContent = texto;
}

// Muestra un error arriba del formulario; con "" lo esconde
export function mostrarError(texto) {
  mensajeError.textContent = texto;
  mensajeError.hidden = texto === "";
}
