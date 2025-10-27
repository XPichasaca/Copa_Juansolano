import { supabase } from "./auth.js";

export async function validarAcceso(pagina) {
  // Verificar sesión activa
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    alert("Debes iniciar sesión primero.");
    window.location.href = "login.html";
    return false;
  }

  const userId = data.session.user.id;

  // Obtener rol
  const { data: perfilData, error } = await supabase
    .from("perfiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !perfilData) {
    alert("No se pudo obtener el rol del usuario.");
    window.location.href = "login.html";
    return false;
  }

  const role = perfilData.role;

  // Validar acceso según página y rol
  if (pagina === "registro.html" && role !== "admin") {
    alert("Acceso denegado. Solo Administradores pueden acceder a esta página.");
    window.location.href = "nomina.html"; // Redirigir a nomina si no es admin
    return false;
  }

  if (pagina === "nomina.html" && !(role === "admin" || role === "control")) {
    alert("Acceso denegado.");
    window.location.href = "login.html";
    return false;
  }

  // Mostrar mensaje personalizado según rol
  const mensajeDiv = document.getElementById("mensajeRol");
  if (mensajeDiv) {
    if (role === "admin") {
      mensajeDiv.textContent = "Has ingresado como Administrador";
    } else if (role === "control") {
      mensajeDiv.textContent = "Has ingresado como Delegado de mesa";
    }
  }

  return true;
}
