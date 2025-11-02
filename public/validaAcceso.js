// validarAcceso.js
import { supabase } from "./auth.js";

/**
 * Valida el acceso del usuario según su sesión y rol.
 * @param {string} pagina - Nombre del archivo HTML actual (ej: "nomina.html")
 */
export async function validarAcceso(pagina) {
  console.log("Validando acceso para:", pagina);

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    // ❌ Si no hay sesión activa → redirige a login
    if (!data.session) {
      console.log("No hay sesión activa. Redirigiendo a login...");
      alert("Debes iniciar sesión primero.");
      window.location.href = "login.html";
      return false;
    }

    const userId = data.session.user.id;

    // Obtener rol del usuario desde la tabla perfiles
    const { data: perfilData, error: perfilError } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (perfilError || !perfilData) {
      console.log("No se pudo obtener el rol del usuario. Redirigiendo a login...");
      alert("Error al obtener el rol del usuario.");
      window.location.href = "login.html";
      return false;
    }

    const role = perfilData.role;
    console.log("Rol detectado:", role);

    // Bloquear acceso según página y rol
    if (pagina === "registro.html" && role !== "admin") {
      alert("Acceso denegado. Solo Administradores pueden acceder a esta página.");
      window.location.href = "nomina.html";
      return false;
    }

    if (pagina === "nomina.html" && !(role === "admin" || role === "control")) {
      alert("Acceso denegado. No tienes permisos para esta página.");
      window.location.href = "login.html";
      return false;
    }

    // Opcional: mostrar mensaje de rol si existe un div
    const mensajeDiv = document.getElementById("mensajeRol");
    if (mensajeDiv) {
      mensajeDiv.textContent =
        role === "admin"
          ? "Has ingresado como Administrador"
          : role === "control"
          ? "Has ingresado como Delegado de mesa"
          : "Has ingresado con rol: " + role;
    }

    return true;
  } catch (err) {
    console.error("Error validando acceso:", err);
    alert("Error al validar acceso. Por seguridad, será redirigido al login.");
    window.location.href = "reg.html";
    return false;
  }
}
