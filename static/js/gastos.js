// gastos.js — los datos y las cuentas. No toca la pantalla ni el navegador.

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

export function siguienteId(lista) {
  let mayor = 0;
  for (const gasto of lista) {
    if (gasto.id > mayor) mayor = gasto.id;
  }
  return mayor + 1;
}

// Del más nuevo al más viejo. [...lista] hace una copia: sort() no toca la original
export function ordenarPorFecha(lista) {
  return [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
}

// mes: "2026-10" o "" (todos) · categoria: "comida" o "" (todas)
export function filtrarGastos(lista, mes, categoria) {
  return lista.filter((gasto) => {
    const coincideMes = mes === "" || gasto.fecha.startsWith(mes);
    const coincideCategoria = categoria === "" || gasto.categoria === categoria;
    return coincideMes && coincideCategoria;
  });
}

// [{ categoria, nombre, total, porcentaje }], de la que más gastó a la que menos
export function resumirPorCategoria(lista) {
  const totalGeneral = calcularTotal(lista);
  const resumen = [];
  for (const [clave, nombre] of Object.entries(CATEGORIAS)) {
    const deEsta = lista.filter((gasto) => gasto.categoria === clave);
    if (deEsta.length === 0) continue;
    const total = calcularTotal(deEsta);
    const porcentaje = Math.round((total / totalGeneral) * 100);
    resumen.push({ categoria: clave, nombre, total, porcentaje });
  }
  return resumen.sort((a, b) => b.total - a.total);
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
