import { supabase } from "./script.js";

// DOM
const form = document.getElementById("formEstadistica");
const tabla = document.getElementById("tablaEstadisticas").querySelector("tbody");
const toggleBtn = document.getElementById("toggleEstadistica");
const cancelarBtn = document.getElementById("cancelarEstadistica");
const partidoSelect = document.getElementById("partidoEstadistica");
const jugadorSelect = document.getElementById("jugadorEstadistica");

// 🔄 Cargar partidos EN VIVO y jugadores
async function cargarListas() {
  const { data: partidos, error: errorPartidos } = await supabase
    .from("partidos")
    .select(`
      id, fecha, equipo_local_id, equipo_visitante_id,
      equipos_local:equipo_local_id(nombre),
      equipos_visitante:equipo_visitante_id(nombre)
    `)
    .eq("estado", "en_vivo")
    .order("fecha", { ascending: false });

  const { data: jugadores, error: errorJugadores } = await supabase
    .from("jugadores")
    .select("id, nombre, equipo:equipo_id(nombre)");

  if (errorPartidos) console.error("Error al cargar partidos en vivo:", errorPartidos.message);
  if (errorJugadores) console.error("Error al cargar jugadores:", errorJugadores.message);

  partidoSelect.innerHTML = `<option value="">Seleccione un partido en vivo</option>`;
  jugadorSelect.innerHTML = `<option value="">Seleccione un jugador</option>`;

  partidos?.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    const local = p.equipos_local?.nombre || "Equipo L";
    const visitante = p.equipos_visitante?.nombre || "Equipo V";
    option.textContent = `${local} vs ${visitante} (${new Date(p.fecha).toLocaleString()})`;
    partidoSelect.appendChild(option);
  });

  jugadores?.forEach(j => {
    const option = document.createElement("option");
    option.value = j.id;
    option.textContent = `${j.nombre} - ${j.equipo?.nombre || "Sin equipo"}`;
    jugadorSelect.appendChild(option);
  });
}

// 📊 Cargar estadísticas
async function cargarEstadisticas() {
  const { data, error } = await supabase
    .from("estadisticas")
    .select(`
      id, 
      tipo_evento, 
      minuto,
      jugador:jugador_id(nombre),
      partido:partido_id(
        id, 
        equipos_local:equipo_local_id(nombre),
        equipos_visitante:equipo_visitante_id(nombre)
      )
    `)
    .order("id", { ascending: false });

  if (error) {
    console.error("Error al cargar estadísticas:", error.message);
    return;
  }

  tabla.innerHTML = "";
  data.forEach(est => {
    const fila = document.createElement("tr");
    const local = est.partido?.equipos_local?.nombre || "Local";
    const visitante = est.partido?.equipos_visitante?.nombre || "Visitante";
    fila.innerHTML = `
      <td>${local} vs ${visitante}</td>
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

  // Guardar o actualizar
  if (id) {
    const { error } = await supabase.from("estadisticas").update(estadistica).eq("id", id);
    if (error) return alert("Error al actualizar: " + error.message);
    alert("Estadística actualizada correctamente");
  } else {
    const { data, error } = await supabase.from("estadisticas").insert([estadistica]).select().single();
    if (error) return alert("Error al agregar: " + error.message);

    // ⚽ Si es un gol, actualizar marcador del partido
    if (estadistica.tipo_evento === "gol") {
      const jugadorId = estadistica.jugador_id;
      const partidoId = estadistica.partido_id;

      const { data: jugador, error: errorJugador } = await supabase
        .from("jugadores")
        .select("equipo_id")
        .eq("id", jugadorId)
        .single();

      if (!errorJugador && jugador?.equipo_id) {
        const { data: partido, error: errorPartido } = await supabase
          .from("partidos")
          .select("marcador_local, marcador_visitante, equipo_local_id, equipo_visitante_id")
          .eq("id", partidoId)
          .single();

        if (!errorPartido && partido) {
          let marcador_local = partido.marcador_local;
          let marcador_visitante = partido.marcador_visitante;

          if (jugador.equipo_id === partido.equipo_local_id) {
            marcador_local += 1;
          } else if (jugador.equipo_id === partido.equipo_visitante_id) {
            marcador_visitante += 1;
          }

          await supabase.from("partidos").update({
            marcador_local,
            marcador_visitante
          }).eq("id", partidoId);
        }
      }
    }

    alert("Estadística registrada correctamente");
  }

  form.reset();
  document.getElementById("estadisticaId").value = "";
  form.classList.add("hidden");
  toggleBtn.textContent = "+ Agregar Estadística";
  cargarEstadisticas();
});

// 🗑️ Eliminar o editar
tabla.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;

  if (e.target.classList.contains("btn-eliminar")) {
    if (confirm("¿Eliminar estadística?")) {
      const { error } = await supabase.from("estadisticas").delete().eq("id", id);
      if (error) return alert("Error: " + error.message);
      alert("Eliminado correctamente");
      cargarEstadisticas();
    }
  }

  if (e.target.classList.contains("btn-editar")) {
    const { data, error } = await supabase.from("estadisticas").select("*").eq("id", id).single();
    if (error) return alert("Error al cargar estadística");

    document.getElementById("estadisticaId").value = data.id;
    partidoSelect.value = data.partido_id;
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

// 🚀 Inicializar
cargarListas();
cargarEstadisticas();
