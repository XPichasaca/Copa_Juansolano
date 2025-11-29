import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Configuración Supabase ---
const SUPABASE_URL = "https://ghstgwywcaxtfdyyjxli.supabase.co";
const SUPABASE_KEY = "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Contenedor en el HTML ---
const contenedor = document.getElementById("partidosEnVivo");

// --- Cargar partidos en vivo ---
async function cargarPartidosEnVivo() {
  try {
    const { data: partidos, error } = await supabase
      .from("partidos")
      .select(`
        id,
        categoria,
        estado,
        marcador_local,
        marcador_visitante,
        equipo_local:equipo_local_id(nombre),
        equipo_visitante:equipo_visitante_id(nombre)
      `)
      .eq("estado", "en_vivo") // solo en vivo
      .order("fecha", { ascending: true });

    if (error) throw error;

    contenedor.innerHTML = "";

    partidos.forEach(p => {
      const div = document.createElement("div");
      div.id = `partido-${p.id}`;
      div.className = "partido-en-vivo";
      div.innerHTML = `
        <strong>${p.equipo_local?.nombre || "Local"} ${p.marcador_local || 0} - ${p.marcador_visitante || 0} ${p.equipo_visitante?.nombre || "Visitante"}</strong>
        <span class="estado">EN VIVO 🔴</span>
        <div id="estadisticas-${p.id}">Cargando estadísticas...</div>
      `;
      contenedor.appendChild(div);

      cargarEstadisticasPartido(p.id);
    });

  } catch (err) {
    console.error("Error cargando partidos en vivo:", err);
    contenedor.textContent = "Error cargando partidos en vivo.";
  }
}

// --- Cargar estadísticas por partido ---
async function cargarEstadisticasPartido(partidoId) {
  const { data, error } = await supabase
    .from("estadisticas")
    .select(`tipo_evento`)
    .eq("partido_id", partidoId);

  if (error) return console.error(error);

  const goles = data.filter(e => e.tipo_evento === "gol").length;
  const amarillas = data.filter(e => e.tipo_evento === "tarjeta_amarilla").length;
  const rojasDirectas = data.filter(e => e.tipo_evento === "tarjeta_roja").length;
  const rojasPorAmarillas = Math.floor(amarillas / 2);
  const rojas = rojasDirectas + rojasPorAmarillas;
  const amarillasRestantes = amarillas % 2;

  const cont = document.getElementById(`estadisticas-${partidoId}`);
  cont.innerHTML = `⚽ Goles: ${goles} &nbsp; 🟨 Amarillas: ${amarillasRestantes} &nbsp; 🟥 Rojas: ${rojas}`;
}

// --- Realtime: actualiza automáticamente ---
supabase
  .channel("realtime-partidos")
  .on("postgres_changes", { event: "*", schema: "public", table: "estadisticas" }, payload => {
    cargarEstadisticasPartido(payload.new.partido_id);
  })
  .on("postgres_changes", { event: "*", schema: "public", table: "partidos" }, () => {
    cargarPartidosEnVivo();
  })
  .subscribe();

// --- Inicializar ---
cargarPartidosEnVivo();
