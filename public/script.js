// =========================
// 🔗 Inicialización Supabase
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


export const supabase = createClient(
  "https://ghstgwywcaxtfdyyjxli.supabase.co",
  "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ"
);




// =========================
// 🔐 Control de sesión
// =========================
const { data: session } = await supabase.auth.getSession();
if (!session.session) {
  alert("Debe iniciar sesión para acceder al panel.");
  window.location.href = "login.html";
}

// =========================
// 🚪 Botón cerrar sesión
// =========================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}

// =========================
// 📂 Control de secciones
// =========================
const botonesMenu = document.querySelectorAll(".menu-btn");
const secciones = document.querySelectorAll("main section");

botonesMenu.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.section;

    // Cambiar estilo activo
    botonesMenu.forEach((b) => b.classList.remove("activo"));
    btn.classList.add("activo");

    // Mostrar sección seleccionada
    secciones.forEach((sec) => {
      if (sec.id === target) sec.classList.remove("hidden");
      else sec.classList.add("hidden");
    });
  });
});

// =========================
// 🧾 Formulario dinámico
// =========================
const toggleBtn = document.getElementById("toggleFormulario");
const formEquipo = document.getElementById("formEquipo");
const cancelarBtn = document.getElementById("cancelar");

// Mostrar / ocultar formulario
if (toggleBtn && formEquipo) {
  toggleBtn.addEventListener("click", () => {
    const isHidden = formEquipo.classList.toggle("hidden");
    toggleBtn.textContent = isHidden
      ? "+ Agregar Nuevo Equipo"
      : "− Ocultar Formulario";
  });
}

// Botón cancelar limpia el formulario
if (cancelarBtn && formEquipo) {
  cancelarBtn.addEventListener("click", () => {
    formEquipo.reset();
    document.getElementById("equipoId").value = "";
  });
}

// =========================
// 🚀 Inicialización de módulos
// =========================

// Cada módulo manejará su propia tabla y formulario
// Los archivos siguientes se cargan con <script type="module">
console.log("✅ Panel administrativo iniciado correctamente");

// Puedes usar eventos personalizados si quieres refrescar datos
// document.dispatchEvent(new Event("cargarEquipos"));
