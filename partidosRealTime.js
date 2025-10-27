import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://djjpoztjzbigudzezjcm.supabase.co";
const SUPABASE_KEY = "sb_publishable_F0yxa4IfQfkoH74PWHk-7w_SW_fcZMY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tbodyMasculino = document.querySelector("#tablaPosicionesMasculino tbody");
const tbodyFemenino = document.querySelector("#tablaPosicionesFemenino tbody");

async function cargarTablaPorCategoria(categoria, tbody) {
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
    .eq("categoria", categoria);

  if (error) {
    console.error(`❌ Error al cargar ${categoria}:`, error.message);
    return;
  }

  const posiciones = {};

  partidos
    .filter(p => ["en_vivo", "finalizado"].includes(p.estado))
    .forEach(p => {
      const local = p.equipo_local?.nombre || "Local";
      const visitante = p.equipo_visitante?.nombre || "Visitante";
      const gl = Number(p.marcador_local) || 0;
      const gv = Number(p.marcador_visitante) || 0;

      // Inicializar equipos
      if (!posiciones[local]) posiciones[local] = { equipo: local, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
      if (!posiciones[visitante]) posiciones[visitante] = { equipo: visitante, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };

      posiciones[local].pj++;
      posiciones[visitante].pj++;

      posiciones[local].gf += gl;
      posiciones[local].gc += gv;
      posiciones[visitante].gf += gv;
      posiciones[visitante].gc += gl;

      if (gl > gv) {
        posiciones[local].pg++;
        posiciones[local].pts += 3;
        posiciones[visitante].pp++;
      } else if (gl < gv) {
        posiciones[visitante].pg++;
        posiciones[visitante].pts += 3;
        posiciones[local].pp++;
      } else {
        posiciones[local].pe++;
        posiciones[visitante].pe++;
        posiciones[local].pts++;
        posiciones[visitante].pts++;
      }
    });

  // Ordenar por puntos y DG
  const tablaOrdenada = Object.values(posiciones)
    .map(e => ({ ...e, dg: e.gf - e.gc }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

  // Dibujar tabla
  tbody.innerHTML = "";
  tablaOrdenada.forEach((e, i) => {
    const fila = document.createElement("tr");
    fila.className = i === 0 ? "oro" : i === 1 ? "plata" : i === 2 ? "bronce" : "";
    fila.innerHTML = `
      <td>${i + 1}</td>
      <td>${e.equipo}</td>
      <td>${e.pj}</td>
      <td>${e.pg}</td>
      <td>${e.pe}</td>
      <td>${e.pp}</td>
      <td>${e.gf}</td>
      <td>${e.gc}</td>
      <td>${e.dg}</td>
      <td><strong>${e.pts}</strong></td>
    `;
    tbody.appendChild(fila);
  });
}

// Cargar inicial
await cargarTablaPorCategoria("masculino", tbodyMasculino);
await cargarTablaPorCategoria("femenino", tbodyFemenino);

// 🔁 Realtime: escucha cualquier cambio en "partidos"
supabase
  .channel("actualizacion-tablas")
  .on(
    "postgres_changes",
    {
      event: "*", // INSERT, UPDATE, DELETE
      schema: "public",
      table: "partidos"
    },
    async payload => {
      console.log("📡 Cambio detectado:", payload.eventType);
      await cargarTablaPorCategoria("masculino", tbodyMasculino);
      await cargarTablaPorCategoria("femenino", tbodyFemenino);
    }
  )
  .subscribe();
