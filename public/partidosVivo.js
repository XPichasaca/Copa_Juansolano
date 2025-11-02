import { supabase } from "./script.js";

// Función para cargar partidos por día
async function cargarJornada() {
  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(`
      id, fecha, estado, categoria,
      marcador_local, marcador_visitante,
      equipos_local:equipo_local_id(nombre),
      equipos_visitante:equipo_visitante_id(nombre)
    `)
    .order("fecha", { ascending: true });

  if (error) return console.error(error);

  // Agrupar por día
  const dias = {};
  partidos.forEach(p => {
    const dia = new Date(p.fecha).toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "short" });
    if (!dias[dia]) dias[dia] = [];
    dias[dia].push(p);
  });

  const contenedor = document.getElementById("listaJornada");
  contenedor.innerHTML = "";

  // Mostrar partidos agrupados
  for (const [dia, lista] of Object.entries(dias)) {
    const bloqueDia = document.createElement("div");
    bloqueDia.classList.add("dia");
    bloqueDia.innerHTML = `<h3>${dia.toUpperCase()}</h3>`;

    for (const p of lista) {
      const partidoDiv = document.createElement("div");
      partidoDiv.classList.add("partido-jornada");
      partidoDiv.innerHTML = `
        <div>
          <span>${p.equipos_local?.nombre || "Local"} ${p.marcador_local} - ${p.marcador_visitante} ${p.equipos_visitante?.nombre || "Visitante"}</span>
          ${p.estado === "en_vivo" ? '<span class="estado">EN VIVO 🔴</span>' : ""}
        </div>
        <div id="estadisticas-${p.id}" class="estadisticas">Cargando estadísticas...</div>
      `;
      bloqueDia.appendChild(partidoDiv);

      // Cargar estadísticas individuales
      cargarEstadisticasPartido(p.id);
    }

    contenedor.appendChild(bloqueDia);
  }
}

// Función para cargar estadísticas por partido
async function cargarEstadisticasPartido(partidoId) {
  const { data: estadisticas, error } = await supabase
    .from("estadisticas")
    .select(`tipo_evento, jugador:jugador_id(nombre), minuto`)
    .eq("partido_id", partidoId);

  if (error) return console.error(error);

  const contenedor = document.getElementById(`estadisticas-${partidoId}`);
  if (!contenedor) return;

  if (estadisticas.length === 0) {
    contenedor.textContent = "Sin eventos registrados.";
    return;
  }

  // Contar goles y tarjetas
  const goles = estadisticas.filter(e => e.tipo_evento === "gol").length;
  const amarillas = estadisticas.filter(e => e.tipo_evento === "tarjeta_amarilla").length;
  const rojas = estadisticas.filter(e => e.tipo_evento === "tarjeta_roja").length;

  contenedor.innerHTML = `
    ⚽ Goles: ${goles} &nbsp; 🟨 Amarillas: ${amarillas} &nbsp; 🟥 Rojas: ${rojas}
  `;
}

// Realtime: si cambia algo en partidos o estadísticas, se actualiza la jornada
supabase
  .channel("realtime-jornada")
  .on("postgres_changes", { event: "*", schema: "public", table: "partidos" }, () => cargarJornada())
  .on("postgres_changes", { event: "*", schema: "public", table: "estadisticas" }, () => cargarJornada())
  .subscribe();

// Inicializar
cargarJornada();
