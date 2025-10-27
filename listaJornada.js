import { supabase } from "./script.js";

async function cargarJornada() {
  const hoy = new Date();
  const proximoSabado = new Date(hoy);
  proximoSabado.setDate(hoy.getDate() + ((6 - hoy.getDay() + 7) % 7));
  const proximoDomingo = new Date(proximoSabado);
  proximoDomingo.setDate(proximoSabado.getDate() + 1);

  const inicio = proximoSabado.toISOString().split("T")[0];
  const fin = proximoDomingo.toISOString().split("T")[0];

  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(`
      id, fecha, estado, categoria,
      marcador_local, marcador_visitante,
      equipos_local:equipo_local_id(nombre, logo_url),
      equipos_visitante:equipo_visitante_id(nombre, logo_url)
    `)
    .gte("fecha", `${inicio}T00:00:00`)
    .lte("fecha", `${fin}T23:59:59`)
    .order("fecha", { ascending: true });

  if (error) {
    console.error("❌ Error al cargar partidos:", error);
    return;
  }

  const contenedor = document.getElementById("listaJornada");
  contenedor.innerHTML = "";

  if (!partidos?.length) {
    contenedor.innerHTML = "<p>No hay partidos programados para el fin de semana.</p>";
    return;
  }

  // Agrupar por día
  const grupos = {};
  for (const p of partidos) {
    const fechaObj = new Date(p.fecha);
    const diaClave = fechaObj.toLocaleDateString("es-EC", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });

    if (!grupos[diaClave]) grupos[diaClave] = [];
    grupos[diaClave].push(p);
  }

  for (const [dia, lista] of Object.entries(grupos)) {
    const bloque = document.createElement("div");
    bloque.classList.add("dia-bloque");

    bloque.innerHTML = `
      <div class="dia-header">
        <span class="fecha">${dia}</span>
      </div>
    `;

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
      if (p.estado === "en_vivo") partido.classList.add("en-vivo");

      partido.innerHTML = `
        <div class="hora-cat">
          <span class="hora">${hora}</span>
          <span class="categoria">${p.categoria || ""}</span>
        </div>
        <div class="equipo equipo-local">
          <img src="${p.equipos_local?.logo_url || 'img/logo.png'}" alt="Local">
          <span>${p.equipos_local?.nombre || "Local"}</span>
        </div>
        <div class="marcador">
          ${p.marcador_local ?? 0} - ${p.marcador_visitante ?? 0}
        </div>
        <div class="equipo equipo-visitante">
         <img src="${p.equipos_visitante?.logo_url || 'img/logo.png'}" alt="Visitante">
          <span>${p.equipos_visitante?.nombre || "Visitante"}</span>
          
        </div>
      `;

      listaDiv.appendChild(partido);
    });

    bloque.appendChild(listaDiv);
    contenedor.appendChild(bloque);
  }
}

// 🔁 Realtime
supabase
  .channel("realtime-partidos-semana")
  .on("postgres_changes", { event: "*", schema: "public", table: "partidos" }, cargarJornada)
  .subscribe();

cargarJornada();
