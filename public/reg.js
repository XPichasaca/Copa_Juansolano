const form = document.getElementById("formCrearUsuario");
const tabla = document.getElementById("tablaUsuarios");

// Crear usuario
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value.toLowerCase(); // minúscula para la tabla

  try {
    const res = await fetch("/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();
    if (data.ok) {
      alert("Usuario creado correctamente ✅");
      form.reset();
      cargarUsuarios();
    } else {
      alert("Error: " + (data.error || "No se pudo crear el usuario"));
    }
  } catch (err) {
    console.error("❌ Error al crear usuario:", err);
  }
});

// Cargar usuarios en tabla
async function cargarUsuarios() {
  try {
    const res = await fetch("/usuarios");
    const usuarios = await res.json();
    tabla.innerHTML = usuarios
      .map(u => `<tr><td>${u.email}</td><td>${u.role}</td></tr>`)
      .join("");
  } catch (err) {
    console.error("❌ Error al listar usuarios:", err);
  }
}

// Cargar al inicio
cargarUsuarios();
