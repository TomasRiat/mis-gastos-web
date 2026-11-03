// login.js — entrar o crear una cuenta; si sale bien, va a la app
const formEntrar = document.querySelector("#form-entrar");
const formCrear = document.querySelector("#form-crear");
const mensaje = document.querySelector("#mensaje");

function mostrarError(texto) {
  mensaje.textContent = texto;
  mensaje.hidden = false;
}

// Manda el email y la clave del formulario a la ruta (/api/login o /api/registro)
async function enviar(ruta, formulario) {
  const datos = new FormData(formulario);
  try {
    const respuesta = await fetch(ruta, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: datos.get("email"), clave: datos.get("clave") }),
    });
    if (respuesta.ok) {
      location.href = "/";        // la cookie de sesión ya quedó guardada
      return;
    }
    const error = await respuesta.json();
    mostrarError(error.error);
  } catch (error) {
    mostrarError(`No pude conectar con el servidor: ${error.message}`);
  }
}

formEntrar.addEventListener("submit", (evento) => {
  evento.preventDefault();
  enviar("/api/login", formEntrar);
});

formCrear.addEventListener("submit", (evento) => {
  evento.preventDefault();
  enviar("/api/registro", formCrear);
});
