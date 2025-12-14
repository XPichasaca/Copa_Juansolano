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
        equipo_local:equipo_local_id(nombre, logo_url),
        equipo_visitante:equipo_visitante_id(nombre, logo_url)
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
    
    <div class="equipo local">
      <img src="${p.equipo_local?.logo_url || 'logo-default.png'}" alt="Logo local">
      <span>${p.equipo_local?.nombre || "Local"}</span>
    </div>

    <span class="marcador">
      ${p.marcador_local || 0} - ${p.marcador_visitante || 0}
    </span>

    <div class="equipo visitante">
      <img src="${p.equipo_visitante?.logo_url || 'logo-default.png'}" alt="Logo visitante">
      <span>${p.equipo_visitante?.nombre || "Visitante"}</span>
    </div>

    <span class="estado">🔴 EN VIVO</span>
  </div>

  <div id="historial-${p.id}" class="historial-eventos">
    Cargando eventos...
  </div>
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
      if (e.tipo_evento === "amarilla") icon = "🟨";
      if (e.tipo_evento === "roja_directa") icon = "🟥";
         if (e.tipo_evento === "roja_doble_amarilla") icon = "🟨🟨🟥";
      

         
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
