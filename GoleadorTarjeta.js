import { supabase } from "./script.js";

const tablaGoleadores = document.querySelector("#tablaGoleadores tbody");
const tablaAmonestados = document.querySelector("#tablaAmonestados tbody");
const contenedorHistorial = document.getElementById("contenedorHistorial");

async function cargarDatos() {
  const { data: estadisticas, error } = await supabase
    .from("estadisticas")
    .select(`
      id,
      tipo_evento,
      minuto,
      jugador:jugador_id(id, nombre, equipo:equipo_id(nombre))
    `);

  if (error) {
    console.error("Error al cargar estadísticas:", error.message);
    return;
  }

  const goles = {};
  const tarjetas = {};

  estadisticas.forEach(est => {
    const jugadorId = est.jugador?.id;
    const nombre = est.jugador?.nombre || "Desconocido";
    const equipo = est.jugador?.equipo?.nombre || "Sin equipo";

    if (!jugadorId) return;

    // ⚽ Goles
    if (est.tipo_evento === "gol") {
      if (!goles[jugadorId]) {
        goles[jugadorId] = { nombre, equipo, total: 0 };
      }
      goles[jugadorId].total += 1;
    }

    // 🟨🟥 Tarjetas
    if (est.tipo_evento === "amarilla" || est.tipo_evento === "roja") {
      if (!tarjetas[jugadorId]) {
        tarjetas[jugadorId] = { nombre, equipo, amarilla: 0, roja: 0 };
      }
      if (est.tipo_evento === "amarilla") {
        tarjetas[jugadorId].amarilla += 1;
      } else if (est.tipo_evento === "roja") {
        tarjetas[jugadorId].roja += 1;
      }
    }
  });

  // 🥅 Mostrar Goleadores
  tablaGoleadores.innerHTML = "";
  Object.values(goles)
    .sort((a, b) => b.total - a.total)
    .forEach(g => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${g.nombre}</td>
        <td>${g.equipo}</td>
        <td>${g.total}</td>
      `;
      tablaGoleadores.appendChild(fila);
    });

  // 🟨🟥 Mostrar Amonestados con checkbox para historial
Object.entries(tarjetas).forEach(([jugadorId, t]) => {
  const rojasExtras = Math.floor(t.amarilla / 2);
  const amarillasRestantes = t.amarilla % 2;
  const totalRojas = t.roja + rojasExtras;

  if (amarillasRestantes > 0 || totalRojas > 0) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${t.nombre}</td>
      <td>${t.equipo}</td>
      <td>
        ${amarillasRestantes > 0 ? `🟨 Tarjeta Amarilla ${amarillasRestantes}<br>` : ""}
        ${rojasExtras > 0 ? `🟥🟨🟨 (doble amarilla)<br>` : ""}
        ${t.roja > 0 ? `🟥 Roja directa ${t.roja}` : ""}
      </td>
      <td>
        ${t.amarilla > 0 ? t.amarilla : ""}
        ${t.amarilla > 0 && t.roja > 0 ? "<br>" : ""}
        ${t.roja > 0 ? t.roja : ""}
      </td>
      <td>
        <input type="checkbox" class="mostrarHistorial" data-jugador-id="${jugadorId}" />
        Mostrar historial
      </td>
    `;
    tablaAmonestados.appendChild(fila);
  }
});

}

// Evento para mostrar historial detallado cuando se activa checkbox
tablaAmonestados.addEventListener("change", async (e) => {
  if (e.target.classList.contains("mostrarHistorial")) {
    const jugadorId = e.target.dataset.jugadorId;

    if (e.target.checked) {
      const { data, error } = await supabase
        .from("estadisticas")
        .select(`
          tipo_evento,
          minuto,
          partido:partido_id(
            fecha,
            equipo_local:equipo_local_id(nombre),
            equipo_visitante:equipo_visitante_id(nombre)
          )
        `)
        .eq("jugador_id", jugadorId);

      if (error) {
        console.error("Error al cargar historial:", error.message);
        contenedorHistorial.innerHTML = "<p>Error cargando historial.</p>";
        return;
      }

      if (!data.length) {
        contenedorHistorial.innerHTML = "<p>No hay eventos registrados para este jugador.</p>";
        return;
      }

      // Ordenar por fecha del partido ascendente
      data.sort((a, b) => new Date(a.partido.fecha) - new Date(b.partido.fecha));

      let html = `<h3>Historial de eventos</h3><ul>`;
      data.forEach(evento => {
        const fecha = new Date(evento.partido.fecha).toLocaleDateString();
        const local = evento.partido.equipo_local?.nombre || "Local desconocido";
        const visitante = evento.partido.equipo_visitante?.nombre || "Visitante desconocido";
        html += `<li>
          ${fecha} - ${local} vs ${visitante} - ${evento.tipo_evento.toUpperCase()} minuto ${evento.minuto}
        </li>`;
      });
      html += "</ul>";
      contenedorHistorial.innerHTML = html;

    } else {
      contenedorHistorial.innerHTML = "";
    }
  }
});

// Ejecutar carga inicial
cargarDatos();
