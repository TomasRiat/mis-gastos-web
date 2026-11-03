// gastos.js — los datos y las cuentas. No toca la pantalla ni el navegador.
// (Ordenar, filtrar y resumir ahora lo hace el servidor: ver api.js, etapas 12.2 y 12.3)

export const CATEGORIAS = {
  comida: "Comida",
  transporte: "Transporte",
  casa: "Casa",
  salidas: "Salidas",
  salud: "Salud",
  otros: "Otros",
};

export function calcularTotal(lista) {
  let suma = 0;
  for (const gasto of lista) {
    suma += gasto.monto;
  }
  return suma;
}

// Revisa que un gasto traído de un archivo tenga la forma correcta
export function esGastoValido(gasto) {
  return (
    typeof gasto === "object" && gasto !== null &&
    /^\d{4}-\d{2}-\d{2}$/.test(gasto.fecha) &&          // AAAA-MM-DD
    Object.hasOwn(CATEGORIAS, String(gasto.categoria)) &&
    typeof gasto.monto === "number" && gasto.monto > 0 &&
    typeof gasto.descripcion === "string" && gasto.descripcion.trim() !== ""
  );
}
