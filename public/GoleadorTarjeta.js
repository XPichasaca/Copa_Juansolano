import { supabase } from "./supabasePublico.js"; 

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
      jugador:jugador_id(id, nombre, equipo:equipo_id(nombre)),
      partido:partido_id(id, fecha, equipo_local:equipo_local_id(nombre), equipo_visitante:equipo_visitante_id(nombre))
    `);

  if (error) {
    console.error("Error al cargar estadísticas:", error.message);
    return;
  }

  const goles = {};
  const tarjetasPorJugador = {};

  estadisticas.forEach(est => {
    const jugadorId = est.jugador?.id;
    const nombre = est.jugador?.nombre || "Desconocido";
    const equipo = est.jugador?.equipo?.nombre || "Sin equipo";

    if (!jugadorId) return;

    // Goles
    if (est.tipo_evento === "gol") {
      if (!goles[jugadorId]) goles[jugadorId] = { nombre, equipo, total: 0 };
      goles[jugadorId].total += 1;
    }

    // Inicializar jugador en tarjetas
    if (!tarjetasPorJugador[jugadorId]) tarjetasPorJugador[jugadorId] = { nombre, equipo, amarilla: 0, doble: 0, roja: 0 };

    // Clasificar tarjetas correctamente
    switch (est.tipo_evento) {
      case "amarilla":
        tarjetasPorJugador[jugadorId].amarilla += 1;
        break;
      case "roja_directa":
        tarjetasPorJugador[jugadorId].roja += 1;
        break;
      case "roja_doble_amarilla":
        tarjetasPorJugador[jugadorId].doble += 1;
        // Restar las 2 amarillas que generaron esta roja
        tarjetasPorJugador[jugadorId].amarilla -= 2;
        if (tarjetasPorJugador[jugadorId].amarilla < 0) tarjetasPorJugador[jugadorId].amarilla = 0;
        break;
    }
  });

  // Mostrar goleadores
  tablaGoleadores.innerHTML = "";
  Object.values(goles)
    .sort((a, b) => b.total - a.total)
    .forEach(g => {
      const fila = document.createElement("tr");
      fila.innerHTML = `<td>${g.nombre}</td><td>${g.equipo}</td><td>${g.total}</td>`;
      tablaGoleadores.appendChild(fila);
    });

  // Mostrar tarjetas de forma limpia
  tablaAmonestados.innerHTML = "";
  Object.entries(tarjetasPorJugador).forEach(([jugadorId, t]) => {
    const tarjetas = [];

    // Amarillas simples solo si quedan, sin número delante
    if (t.amarilla > 0) tarjetas.push("🟨");

    // Dobles amarillas
    for (let i = 0; i < t.doble; i++) {
      tarjetas.push("🟨🟨🟥");
    }

    // Rojas directas
    for (let i = 0; i < t.roja; i++) {
      tarjetas.push("🟥");
    }

    if (tarjetas.length === 0) return;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${t.nombre}</td>
      <td>${t.equipo}</td>
      <td>${tarjetas.join(", ")}</td>
      <td><input type="checkbox" class="mostrarHistorial" data-jugador-id="${jugadorId}" /> Mostrar historial</td>
    `;
    tablaAmonestados.appendChild(fila);
  });
}

// Mostrar historial completo por jugador
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

      data.sort((a, b) => new Date(a.partido.fecha) - new Date(b.partido.fecha));

      let html = `<h3>Historial de eventos</h3><ul>`;
      data.forEach(ev => {
        const fecha = new Date(ev.partido.fecha).toLocaleDateString();
        const local = ev.partido.equipo_local?.nombre || "Local";
        const visitante = ev.partido.equipo_visitante?.nombre || "Visitante";
        html += `<li>${fecha} - ${local} vs ${visitante} - ${ev.tipo_evento.toUpperCase()} minuto ${ev.minuto}</li>`;
      });
      html += "</ul>";
      contenedorHistorial.innerHTML = html;
    } else {
      contenedorHistorial.innerHTML = "";
    }
  }
});

// Inicializar carga
cargarDatos();
