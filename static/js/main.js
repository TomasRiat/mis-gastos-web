// main.js — arranca la app y conecta los eventos con los datos
// Mis Gastos web — etapa 11: publicada en Render
import { ordenarPorFecha, filtrarGastos, esGastoValido } from "./gastos.js";
import { traerUsuario, cerrarSesion, cargarGastos, agregarGasto, editarGasto, borrarGasto, importarGastos, exportarGastos, leerArchivo } from "./almacen.js";
import { traerDolar } from "./dolar.js";
import * as vista from "./vista.js";

let gastos = [];          // la lista llega del servidor al arrancar
let dolar = null;          // la cotización llega después, desde internet
let editandoId = null;    // null = el formulario agrega; un número = edita ese gasto

const formulario = document.querySelector("#form-gasto");
const lista = document.querySelector("#lista");
const filtroMes = document.querySelector("#filtro-mes");
const filtroCategoria = document.querySelector("#filtro-categoria");
const botonCancelar = document.querySelector("#cancelar");
const botonExportar = document.querySelector("#exportar");
const campoImportar = document.querySelector("#importar");
const botonSalir = document.querySelector("#salir");

// Vuelve a dibujar todo a partir de los datos y los filtros elegidos
function actualizar() {
  const visibles = filtrarGastos(ordenarPorFecha(gastos), filtroMes.value, filtroCategoria.value);
  vista.mostrarGastos(visibles);
  vista.mostrarResumen(visibles);
  if (dolar !== null) vista.mostrarDolares(visibles, dolar);
}

function leerFormulario() {
  const datos = new FormData(formulario);
  return {
    fecha: datos.get("fecha"),
    categoria: datos.get("categoria"),
    monto: Number(datos.get("monto")),   // los formularios devuelven texto
    descripcion: datos.get("descripcion").trim(),
  };
}

function terminarEdicion() {
  editandoId = null;
  formulario.reset();
  vista.modoEdicion(false);
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = leerFormulario();
  try {
    if (editandoId === null) {
      gastos.push(await agregarGasto(datos));   // el servidor le puso el id
    } else {
      const editado = await editarGasto(editandoId, datos);
      // map() arma una lista nueva: el gasto editado se reemplaza, el resto queda igual
      gastos = gastos.map((gasto) => (gasto.id === editado.id ? editado : gasto));
    }
    vista.mostrarError("");   // si había un error de antes, se va
    terminarEdicion();
    actualizar();
  } catch (error) {
    vista.mostrarError(error.message);   // el formulario queda como estaba, para corregirlo
  }
});

// Un solo listener para los botones de todas las filas (delegación)
lista.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button");
  if (!boton) return;
  const id = Number(boton.dataset.id);
  if (boton.classList.contains("borrar")) {
    try {
      await borrarGasto(id);
      gastos = gastos.filter((gasto) => gasto.id !== id);
      if (editandoId === id) terminarEdicion();
      actualizar();
    } catch (error) {
      vista.mostrarError(error.message);
    }
  } else if (boton.classList.contains("editar")) {
    editandoId = id;
    vista.llenarFormulario(gastos.find((gasto) => gasto.id === id));
    vista.modoEdicion(true);
  }
});

botonCancelar.addEventListener("click", terminarEdicion);

filtroMes.addEventListener("input", actualizar);
filtroCategoria.addEventListener("change", actualizar);

botonExportar.addEventListener("click", () => {
  exportarGastos(gastos);
  vista.mostrarMensaje(`Exporté ${gastos.length} gastos.`);
});

campoImportar.addEventListener("change", async () => {
  const archivo = campoImportar.files[0];
  if (!archivo) return;
  try {
    const datos = await leerArchivo(archivo);
    if (!Array.isArray(datos)) throw new Error("no tiene una lista de gastos");
    const validos = datos.filter(esGastoValido);
    // todos juntos en un solo pedido; después, la lista actualizada
    const resultado = await importarGastos(validos);
    gastos = await cargarGastos();
    terminarEdicion();
    actualizar();
    const descartados = datos.length - validos.length;
    vista.mostrarMensaje(`Importé ${resultado.importados} gastos` + (descartados > 0 ? ` (descarté ${descartados} incompletos).` : "."));
  } catch (error) {
    vista.mostrarMensaje(`No pude leer el archivo: ${error.message}.`);
  }
  campoImportar.value = "";   // así se puede volver a elegir el mismo archivo
});

botonSalir.addEventListener("click", async () => {
  await cerrarSesion();
  location.href = "/login.html";
});

async function cargarDolar() {
  try {
    dolar = await traerDolar();
    actualizar();
  } catch (error) {
    vista.dolarNoDisponible();
    console.warn("No hay cotización:", error.message);
  }
}

// Primero quién sos y tu lista (mientras tanto, «Cargando gastos…»), después el dólar
async function iniciar() {
  try {
    const usuario = await traerUsuario();   // sin sesión, almacen.js te manda a entrar
    vista.mostrarUsuario(usuario.email);
    gastos = await cargarGastos();
    actualizar();
  } catch (error) {
    vista.mostrarError(`No pude traer los gastos: ${error.message}`);
  }
  cargarDolar();
}

iniciar();
