// tablaresumen.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔗 Conexión a Supabase
const SUPABASE_URL = "https://djjpoztjzbigudzezjcm.supabase.co";
const SUPABASE_KEY = "sb_publishable_F0yxa4IfQfkoH74PWHk-7w_SW_fcZMY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ⚙️ Función para cargar tabla resumen por categoría
async function cargarResumenTabla(categoria, idTabla) {
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
      .eq("categoria", categoria)
      .in("estado", ["en_vivo", "finalizado"]);

    if (error) throw error;

    const posiciones = {};

    partidos.forEach(p => {
      const local = p.equipo_local?.nombre || "Local";
      const visitante = p.equipo_visitante?.nombre || "Visitante";

      if (!posiciones[local]) posiciones[local] = { equipo: local, pj: 0, pts: 0, gf: 0, gc: 0 };
      if (!posiciones[visitante]) posiciones[visitante] = { equipo: visitante, pj: 0, pts: 0, gf: 0, gc: 0 };

      posiciones[local].pj++;
      posiciones[visitante].pj++;

      posiciones[local].gf += p.marcador_local || 0;
      posiciones[local].gc += p.marcador_visitante || 0;

      posiciones[visitante].gf += p.marcador_visitante || 0;
      posiciones[visitante].gc += p.marcador_local || 0;

      if (p.marcador_local > p.marcador_visitante) posiciones[local].pts += 3;
      else if (p.marcador_local < p.marcador_visitante) posiciones[visitante].pts += 3;
      else {
        posiciones[local].pts++;
        posiciones[visitante].pts++;
      }
    });

    const tablaOrdenada = Object.values(posiciones)
      .map(e => ({ ...e, dg: e.gf - e.gc }))
      .sort((a, b) => b.pts - a.pts || b.dg - a.dg);

    const tbody = document.querySelector(`#${idTabla} tbody`);
    tbody.innerHTML = "";

    if (tablaOrdenada.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No hay datos disponibles.</td></tr>`;
      return;
    }

    tablaOrdenada.forEach((e, i) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${i + 1}</td>
        <td>${e.equipo}</td>
        <td>${e.pts}</td>
        <td>${e.pj}</td>
        <td>${e.dg}</td>
      `;
      tbody.appendChild(fila);
    });

  } catch (err) {
    console.error("❌ Error al cargar tabla:", err.message);
  }
}

// 🚀 Cargar ambas tablas al inicio
cargarResumenTabla("masculino", "resumenTablaMasculino");
cargarResumenTabla("femenino", "resumenTablaFemenino");

// 🔁 Actualizar automáticamente cada 30 segundos
setInterval(() => {
  cargarResumenTabla("masculino", "resumenTablaMasculino");
  cargarResumenTabla("femenino", "resumenTablaFemenino");
}, 30000);
