import { supabase } from "./script.js";

// DOM
const form = document.getElementById("formEstadistica");
const tabla = document.getElementById("tablaEstadisticas").querySelector("tbody");
const toggleBtn = document.getElementById("toggleEstadistica");
const cancelarBtn = document.getElementById("cancelarEstadistica");
const partidoSelect = document.getElementById("partidoEstadistica");
const jugadorSelect = document.getElementById("jugadorEstadistica");

// 🔄 Cargar partidos EN VIVO
async function cargarPartidos() {
  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(`
      id, fecha, equipo_local_id, equipo_visitante_id,
      equipos_local:equipo_local_id(nombre),
      equipos_visitante:equipo_visitante_id(nombre)
    `)
    .eq("estado", "en_vivo")
    .order("fecha", { ascending: false });

  if (error) return console.error("Error al cargar partidos:", error.message);

  partidoSelect.innerHTML = `<option value="">Seleccione un partido en vivo</option>`;
  partidos?.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    const local = p.equipos_local?.nombre || "Local";
    const visitante = p.equipos_visitante?.nombre || "Visitante";
    option.textContent = `${local} vs ${visitante} (${new Date(p.fecha).toLocaleString()})`;
    partidoSelect.appendChild(option);
  });
}

// 🔄 Cargar jugadores dependiendo del partido
async function cargarJugadoresPorPartido(partidoId) {
  jugadorSelect.innerHTML = `<option value="">Seleccione un jugador</option>`;
  if (!partidoId) return;

  const { data: partido } = await supabase
    .from("partidos")
    .select("equipo_local_id, equipo_visitante_id")
    .eq("id", partidoId)
    .single();

  if (!partido) return;

  const { data: jugadores } = await supabase
    .from("jugadores")
    .select("id, nombre, equipo_id")
    .in("equipo_id", [partido.equipo_local_id, partido.equipo_visitante_id])
    .order("nombre");

  jugadores?.forEach(j => {
    const option = document.createElement("option");
    option.value = j.id;
    option.textContent = j.nombre;
    jugadorSelect.appendChild(option);
  });
}

// 📊 Cargar estadísticas
async function cargarEstadisticas() {
  const { data, error } = await supabase
    .from("estadisticas")
    .select(`
      id, tipo_evento, minuto,
      jugador:jugador_id(nombre),
      partido:partido_id(
        id, 
        equipos_local:equipo_local_id(nombre),
        equipos_visitante:equipo_visitante_id(nombre),
        marcador_local,
        marcador_visitante
      )
    `)
    .order("id", { ascending: false });

  if (error) return console.error("Error al cargar estadísticas:", error.message);

  tabla.innerHTML = "";
  data.forEach(est => {
    const local = est.partido?.equipos_local?.nombre || "Local";
    const visitante = est.partido?.equipos_visitante?.nombre || "Visitante";
    const marcadorLocal = est.partido?.marcador_local ?? 0;
    const marcadorVisit = est.partido?.marcador_visitante ?? 0;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${local} vs ${visitante} (${marcadorLocal} - ${marcadorVisit})</td>
      <td>${est.jugador?.nombre || "Sin jugador"}</td>
      <td>${est.tipo_evento}</td>
      <td>${est.minuto}'</td>
      <td>
        <button class="btn-editar" data-id="${est.id}">✏️</button>
        <button class="btn-eliminar" data-id="${est.id}">🗑️</button>
      </td>
    `;
    tabla.appendChild(fila);
  });
}

// ➕ / ✏️ Guardar estadística
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const estadistica = {
    partido_id: partidoSelect.value,
    jugador_id: jugadorSelect.value,
    tipo_evento: document.getElementById("tipo_evento").value,
    minuto: parseInt(document.getElementById("minuto").value),
  };

  const id = document.getElementById("estadisticaId").value;

  if (!estadistica.partido_id || !estadistica.jugador_id) return alert("Seleccione partido y jugador.");

  if (id) {
    const { error } = await supabase.from("estadisticas").update(estadistica).eq("id", id);
    if (error) return alert("Error al actualizar: " + error.message);
    alert("Estadística actualizada correctamente");
  } else {
    const { error } = await supabase.from("estadisticas").insert([estadistica]);
    if (error) return alert("Error al agregar: " + error.message);
    alert("Estadística registrada correctamente");
  }

  form.reset();
  document.getElementById("estadisticaId").value = "";
  form.classList.add("hidden");
  toggleBtn.textContent = "+ Agregar Estadística";
  cargarEstadisticas();
});

// 🗑️ / ✏️ Editar y eliminar
tabla.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;

  if (e.target.classList.contains("btn-eliminar")) {
    if (confirm("¿Eliminar estadística?")) {
      const { error } = await supabase.from("estadisticas").delete().eq("id", id);
      if (error) return alert("Error: " + error.message);
      cargarEstadisticas();
    }
  }

  if (e.target.classList.contains("btn-editar")) {
    const { data } = await supabase.from("estadisticas").select("*").eq("id", id).single();

    document.getElementById("estadisticaId").value = data.id;
    partidoSelect.value = data.partido_id;
    await cargarJugadoresPorPartido(data.partido_id);
    jugadorSelect.value = data.jugador_id;
    document.getElementById("tipo_evento").value = data.tipo_evento;
    document.getElementById("minuto").value = data.minuto;

    form.classList.remove("hidden");
    toggleBtn.textContent = "− Ocultar Formulario";
  }
});

// Mostrar/ocultar formulario
toggleBtn.addEventListener("click", () => {
  form.classList.toggle("hidden");
  toggleBtn.textContent = form.classList.contains("hidden") 
    ? "+ Agregar Estadística" 
    : "− Ocultar Formulario";
});

cancelarBtn.addEventListener("click", () => {
  form.reset();
  document.getElementById("estadisticaId").value = "";
  form.classList.add("hidden");
  toggleBtn.textContent = "+ Agregar Estadística";
});

// 🔄 Evento cambio de partido
partidoSelect.addEventListener("change", () => {
  cargarJugadoresPorPartido(partidoSelect.value);
});

// 🚀 Inicializar
cargarPartidos();
cargarEstadisticas();
