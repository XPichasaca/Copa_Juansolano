import { supabase } from "./script.js";

// 🧩 Referencias HTML
const form = document.getElementById("formJugador");
const tabla = document.getElementById("tablaJugadores").querySelector("tbody");
const toggleBtn = document.getElementById("toggleFormularioJugador");
const cancelarBtn = document.getElementById("cancelarJugador");
const selectEquipo = document.getElementById("equipo_id");

// 🧾 Cargar equipos al select
async function cargarEquipos() {
  const { data, error } = await supabase
    .from("equipos")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al cargar equipos:", error);
    return;
  }

  selectEquipo.innerHTML = '<option value="">Seleccione equipo...</option>';
  data.forEach(eq => {
    const option = document.createElement("option");
    option.value = eq.id;
    option.textContent = eq.nombre;
    selectEquipo.appendChild(option);
  });
}

// 🧾 Cargar jugadores
async function cargarJugadores() {
  const { data, error } = await supabase
    .from("jugadores")
    .select(`
      id,
      nombre,
      posicion,
      dorsal,
      fecha_nacimiento,
      origen_vinculo,
      categoria,
      equipo_id,
      equipos (nombre)
    `)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error al cargar jugadores:", error);
    return;
  }

  tabla.innerHTML = "";
  data.forEach(j => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${j.nombre}</td>
      <td>${j.posicion}</td>
      <td>${j.dorsal}</td>
      <td>${j.fecha_nacimiento}</td>
      <td>${j.origen_vinculo}</td>
      <td>${j.equipos ? j.equipos.nombre : "-"}</td>
      <td>${j.categoria}</td>
      <td>
        <button class="btn-editar" data-id="${j.id}">✏️</button>
        <button class="btn-eliminar" data-id="${j.id}">🗑️</button>
      </td>
    `;
    tabla.appendChild(fila);
  });
}

// ➕ Agregar o editar jugador
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const jugador = {
    nombre: document.getElementById("nombreJugador").value,
    posicion: document.getElementById("posicion").value,
    dorsal: parseInt(document.getElementById("dorsal").value),
    fecha_nacimiento: document.getElementById("fecha_nacimiento").value,
    origen_vinculo: document.getElementById("origen_vinculo").value,
    equipo_id: parseInt(document.getElementById("equipo_id").value),
    categoria: document.getElementById("categoriaJugador").value,
  };

  const id = document.getElementById("jugadorId").value;

  let error;
  if (id) {
    // Actualizar jugador existente
    ({ error } = await supabase.from("jugadores").update(jugador).eq("id", id));
    if (error) {
      alert("Error al actualizar: " + error.message);
      return;
    }
    alert("Jugador actualizado correctamente");
  } else {
    // Insertar nuevo jugador
    ({ error } = await supabase.from("jugadores").insert([jugador]));
    if (error) {
      alert("Error al guardar: " + error.message);
      return;
    }
    alert("Jugador guardado correctamente");
  }

  form.reset();
  document.getElementById("jugadorId").value = "";
  form.classList.add("hidden");
  toggleBtn.textContent = "+ Agregar Jugador";
  cargarJugadores();
});

// 🗑️ Eliminar o ✏️ Editar jugador
tabla.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;

  if (e.target.classList.contains("btn-eliminar")) {
    if (confirm("¿Seguro que deseas eliminar este jugador?")) {
      const { error } = await supabase.from("jugadores").delete().eq("id", id);
      if (error) {
        alert("Error al eliminar: " + error.message);
        return;
      }
      alert("Jugador eliminado correctamente");
      cargarJugadores();
    }
  }

  if (e.target.classList.contains("btn-editar")) {
    const { data, error } = await supabase.from("jugadores").select("*").eq("id", id).single();
    if (error) {
      alert("Error al cargar jugador: " + error.message);
      return;
    }

    document.getElementById("jugadorId").value = data.id;
    document.getElementById("nombreJugador").value = data.nombre;
    document.getElementById("posicion").value = data.posicion;
    document.getElementById("dorsal").value = data.dorsal;
    document.getElementById("fecha_nacimiento").value = data.fecha_nacimiento;
    document.getElementById("origen_vinculo").value = data.origen_vinculo;
    document.getElementById("equipo_id").value = data.equipo_id;
    document.getElementById("categoriaJugador").value = data.categoria;

    form.classList.remove("hidden");
    toggleBtn.textContent = "− Ocultar Formulario";
  }
});

// 🔄 Mostrar / ocultar formulario
toggleBtn.addEventListener("click", () => {
  form.classList.toggle("hidden");
  toggleBtn.textContent = form.classList.contains("hidden") ? "+ Agregar Jugador" : "− Ocultar Formulario";
});

cancelarBtn.addEventListener("click", () => {
  form.reset();
  document.getElementById("jugadorId").value = "";
  form.classList.add("hidden");
  toggleBtn.textContent = "+ Agregar Jugador";
});

// 🚀 Inicialización
cargarEquipos();
cargarJugadores();
