// dolar.js — cotización del dólar blue (DolarAPI), con respaldo guardado

// true = no usa internet: lee la cotización guardada en datos-ejemplo/
const USAR_DATOS_LOCALES = false;
const URL_DOLAR = "https://dolarapi.com/v1/dolares/blue";
const URL_RESPALDO = "datos-ejemplo/dolar-blue.json";

// Pide la cotización a DolarAPI; si falla (sin internet, API caída), usa la guardada
export async function traerDolar() {
  if (!USAR_DATOS_LOCALES) {
    try {
      const respuesta = await fetch(URL_DOLAR);
      if (!respuesta.ok) {
        throw new Error(`DolarAPI respondió ${respuesta.status}`);
      }
      return await respuesta.json();
    } catch (error) {
      console.warn("Uso la cotización guardada:", error.message);
    }
  }
  const respuesta = await fetch(URL_RESPALDO);
  const datos = await respuesta.json();
  datos.respaldo = true;
  return datos;
}
