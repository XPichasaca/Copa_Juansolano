import { supabase } from "./script.js";

async function cargarTablaPosiciones() {
  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(`
      id, 
      equipo_local_id, 
      equipo_visitante_id, 
      marcador_local, 
      marcador_visitante,
      estado,
      equipos_local:equipo_local_id(nombre),
      equipos_visitante:equipo_visitante_id(nombre)
    `);

  if (error) {
    console.error("Error al cargar partidos:", error.message);
    return;
  }

  const posiciones = {};

  partidos
    .filter(p => p.estado === 'finalizado' || p.estado === 'en_vivo') // Solo en vivo o finalizados
    .forEach(p => {
      const local = p.equipos_local?.nombre || "Equipo Local";
      const visitante = p.equipos_visitante?.nombre || "Equipo Visitante";

      if (!posiciones[local]) posiciones[local] = { equipo: local, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
      if (!posiciones[visitante]) posiciones[visitante] = { equipo: visitante, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };

      posiciones[local].pj++;
      posiciones[visitante].pj++;

      posiciones[local].gf += p.marcador_local || 0;
      posiciones[visitante].gf += p.marcador_visitante || 0;

      posiciones[local].gc += p.marcador_visitante || 0;
      posiciones[visitante].gc += p.marcador_local || 0;

      if (p.marcador_local > p.marcador_visitante) {
        posiciones[local].pg++;
        posiciones[local].pts += 3;
        posiciones[visitante].pp++;
      } else if (p.marcador_local < p.marcador_visitante) {
        posiciones[visitante].pg++;
        posiciones[visitante].pts += 3;
        posiciones[local].pp++;
      } else if (p.marcador_local !== null && p.marcador_visitante !== null) {
        posiciones[local].pe++;
        posiciones[visitante].pe++;
        posiciones[local].pts++;
        posiciones[visitante].pts++;
      }
    });

  const tablaOrdenada = Object.values(posiciones)
    .map(e => ({ ...e, dg: e.gf - e.gc }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

  const tbody = document.querySelector("#tablaPosiciones tbody");
  tbody.innerHTML = "";

  tablaOrdenada.forEach((e, i) => {
    const fila = document.createElement("tr");
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

cargarTablaPosiciones();
