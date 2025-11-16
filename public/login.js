import { supabase } from "./auth.js";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert("Usuario o contraseña incorrectos. Por favor, ingresa con un usuario Administrador o Delegado de mesa.");
    return;
  }

  const userId = data.user.id;

  const { data: perfilData, error: perfilError } = await supabase
    .from("perfiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (perfilError || !perfilData) {
    alert("No se pudo obtener el rol del usuario. Contacta al administrador.");
    return;
  }

  // Guardar rol
  localStorage.setItem("rol", perfilData.role);

  // Mensaje de bienvenida
  document.getElementById("mensajeBienvenida").style.display = "block";
  document.getElementById("bienvenidaTexto").innerText = `¡Bienvenido, ${email}!`;

  setTimeout(() => {
    if (perfilData.role === "admin") {
      window.location.href = "registro.html";
    } else if (perfilData.role === "control") {
      window.location.href = "nomina.html";
    } else {
      alert("Rol no válido. Contacta al administrador.");
    }
  }, 1500);
});
