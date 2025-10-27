import { supabase } from "./script.js";

async function cargarPartidosPublico() {
  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(`
      id, fecha, estado, categoria,
      marcador_local, marcador_visitante,
      equipos_local:equipo_local_id(nombre, logo_url),
      equipos_visitante:equipo_visitante_id(nombre, logo_url)
    `)
    .order("fecha", { ascending: true });

  if (error) return console.error("Error al cargar partidos:", error);

  const contenedor = document.getElementById("listaPartidos");
  contenedor.innerHTML = "";

  if (!partidos?.length) {
    contenedor.innerHTML = "<p>No hay partidos registrados.</p>";
    return;
  }

  // Agrupar partidos por día
  const grupos = {};
  partidos.forEach(p => {
    const dia = new Date(p.fecha).toLocaleDateString("es-EC", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    if (!grupos[dia]) grupos[dia] = [];
    grupos[dia].push(p);
  });

  // Mostrar partidos por grupo de día
  for (const [dia, lista] of Object.entries(grupos)) {
    const bloque = document.createElement("div");
    bloque.classList.add("dia-bloque");

    bloque.innerHTML = `<div class="dia-header"><span>${dia.toUpperCase()}</span></div>`;

    const listaDiv = document.createElement("div");
    listaDiv.classList.add("lista-partidos");

    lista.forEach(p => {
      const hora = new Date(p.fecha).toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });

      const partido = document.createElement("div");
      partido.classList.add("partido-item");

      // Colores según estado
      if (p.estado === "en_vivo") partido.classList.add("en-vivo");
      else if (p.estado === "finalizado") partido.classList.add("finalizado");
      else partido.classList.add("pendiente");

      // 🧩 Estructura visual
      partido.innerHTML = `
  <div class="hora-categoria">
    <span class="hora">${hora}</span>
    <span class="categoria">${p.categoria}</span>
  </div>

  <div class="partido-detalle">
    <div class="equipo equipo-local">
       <img src="${p.equipos_local?.logo_url || 'img/logo.png'}" alt="Local">
      <span>${p.equipos_local?.nombre || "Local"}</span>
     
    </div>

    <div class="marcador">
      <span>${p.marcador_local ?? 0} - ${p.marcador_visitante ?? 0}</span>
      
    </div>
    

    <div class="equipo equipo-visitante">
    <img src="${p.equipos_visitante?.logo_url || 'img/logo.png'}" alt="Visitante">
      <span>${p.equipos_visitante?.nombre || "Visitante"}</span>
    </div>

     <div class="hora-categoria">
   <span class="estado-partido">${p.estado.replace('_', ' ').toUpperCase()}</span> </div>
  </div>
  </div>
`;



      listaDiv.appendChild(partido);
    });

    bloque.appendChild(listaDiv);
    contenedor.appendChild(bloque);
  }
}

// 🔁 Realtime para actualizaciones automáticas
supabase
  .channel("realtime-partidos-publico")
  .on("postgres_changes", { event: "*", schema: "public", table: "partidos" }, cargarPartidosPublico)
  .on("postgres_changes", { event: "*", schema: "public", table: "estadisticas" }, cargarPartidosPublico)
  .subscribe();

cargarPartidosPublico();
