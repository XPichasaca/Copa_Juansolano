// /public/js/auth.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://djjpoztjzbigudzezjcm.supabase.co",
  "sb_publishable_F0yxa4IfQfkoH74PWHk-7w_SW_fcZMY"
);

// ✅ Verificar si el usuario está logueado
export async function verificarSesion() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    alert("Debes iniciar sesión primero.");
    window.location.href = "login.html";
  } else {
    console.log("Sesión activa:", data.session.user.email);
  }
}

// ✅ Cerrar sesión
export async function cerrarSesion() {
  await supabase.auth.signOut();
  alert("Sesión cerrada correctamente.");
  window.location.href = "login.html";
}

// Agregar botón de logout en páginas protegidas
export function agregarBotonLogout() {
  const btnLogout = document.createElement("button");
  btnLogout.textContent = "Cerrar Sesión";
  btnLogout.classList.add("btn-cancelar");
  btnLogout.style.marginLeft = "20px";
  btnLogout.addEventListener("click", cerrarSesion);
  document.querySelector("header").appendChild(btnLogout);
}
