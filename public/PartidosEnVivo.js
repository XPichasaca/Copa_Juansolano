import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://ghstgwywcaxtfdyyjxli.supabase.co";
const SUPABASE_KEY = "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const partidosEnVivo = document.getElementById("partidosEnVivo");



// Función para cargar partidos en vivo
async function cargarPartidosEnVivo() {
  try {
    const { data: partidos, error } = await supabase
      .from("partidos")
      .select(`
        id,
        fecha,
        estado,
        marcador_local,
        marcador_visitante,
        equipo_local:equipo_local_id(nombre),
        equipo_visitante:equipo_visitante_id(nombre)
      `)
      .eq("estado", "en_vivo")
      .order("fecha", { ascending: true });

    if (error) throw error;

    partidosEnVivo.innerHTML = "";

    if (!partidos || partidos.length === 0) {
      partidosEnVivo.innerHTML = "<p>No hay partidos en vivo</p>";
      return;
    }

    partidos.forEach(p => {
      const div = document.createElement("div");
      div.classList.add("partido-en-vivo");
      div.innerHTML = `
        <div class="encabezado">
          <span class="equipo">${p.equipo_local?.nombre || "Local"}</span>
          <span class="marcador">${p.marcador_local || 0} - ${p.marcador_visitante || 0}</span>
          <span class="equipo">${p.equipo_visitante?.nombre || "Visitante"}</span>
          <span class="estado">🔴 EN VIVO</span>
        </div>
        <div id="historial-${p.id}" class="historial-eventos">Cargando eventos...</div>
      `;
      partidosEnVivo.appendChild(div);

      // Cargar eventos del partido
      cargarEventosPartido(p.id);
    });

  } catch (err) {
    console.error("Error cargando partidos en vivo:", err);
    partidosEnVivo.innerHTML = "<p>Error cargando partidos en vivo</p>";
  }
}

// Función para cargar eventos de un partido
async function cargarEventosPartido(partidoId) {
  try {
    const { data: eventos, error } = await supabase
      .from("estadisticas")
      .select(`
        tipo_evento,
        minuto,
        jugador:jugador_id(nombre)
      `)
      .eq("partido_id", partidoId)
      .order("minuto", { ascending: true });

    if (error) throw error;

    const cont = document.getElementById(`historial-${partidoId}`);
    if (!cont) return;

    if (!eventos || eventos.length === 0) {
      cont.innerHTML = "<p>Sin eventos registrados</p>";
      return;
    }

    cont.innerHTML = eventos.map(e => {
      let icon = "";
      if (e.tipo_evento === "gol") icon = "⚽";
      if (e.tipo_evento === "tarjeta_amarilla") icon = "🟨";
      if (e.tipo_evento === "tarjeta_roja") icon = "🟥";
      return `<div>${icon} ${e.jugador?.nombre || e.jugador} - ${e.minuto}'</div>`;
    }).join("");
  } catch (err) {
    console.error("Error cargando eventos:", err);
  }
}

// Realtime: actualizar automáticamente
supabase
  .channel("realtime-partidos")
  .on("postgres_changes", { event: "*", schema: "public", table: "partidos" }, () => cargarPartidosEnVivo())
  .on("postgres_changes", { event: "*", schema: "public", table: "estadisticas" }, () => cargarPartidosEnVivo())
  .subscribe();

// Inicializar
cargarPartidosEnVivo();
