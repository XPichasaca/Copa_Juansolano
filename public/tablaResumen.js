import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔗 Conexión a Supabase
const SUPABASE_URL = "https://ghstgwywcaxtfdyyjxli.supabase.co";
const SUPABASE_KEY = "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ⚙️ Función para cargar tabla resumen por categoría con logo
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
        equipo_local:equipo_local_id(id,nombre,logo_url),
        equipo_visitante:equipo_visitante_id(id,nombre,logo_url)
      `)
      .eq("categoria", categoria)
      .in("estado", ["en_vivo", "finalizado"]);

    if (error) throw error;

    const posiciones = {};

    partidos.forEach(p => {
      const local = p.equipo_local?.nombre || "Local";
      const visitante = p.equipo_visitante?.nombre || "Visitante";

      // Inicializar
      if (!posiciones[local]) posiciones[local] = { equipo: p.equipo_local, pj: 0, pts: 0, gf: 0, gc: 0 };
      if (!posiciones[visitante]) posiciones[visitante] = { equipo: p.equipo_visitante, pj: 0, pts: 0, gf: 0, gc: 0 };

      posiciones[local].pj++;
      posiciones[visitante].pj++;

      posiciones[local].gf += Number(p.marcador_local) || 0;
      posiciones[local].gc += Number(p.marcador_visitante) || 0;

      posiciones[visitante].gf += Number(p.marcador_visitante) || 0;
      posiciones[visitante].gc += Number(p.marcador_local) || 0;

      if ((p.marcador_local || 0) > (p.marcador_visitante || 0)) posiciones[local].pts += 3;
      else if ((p.marcador_local || 0) < (p.marcador_visitante || 0)) posiciones[visitante].pts += 3;
      else {
        posiciones[local].pts++;
        posiciones[visitante].pts++;
      }
    });

    const tablaOrdenada = Object.values(posiciones)
      .map(e => ({ ...e, dg: e.gf - e.gc }))
      .sort((a, b) => b.pts - a.pts || b.dg - a.dg);

    const tbody = document.querySelector(`#${idTabla} tbody`);
    tbody.innerHTML = ""; // Vaciar antes de agregar filas

    if (tablaOrdenada.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No hay datos disponibles.</td></tr>`;
      return;
    }

    tablaOrdenada.forEach((e, i) => {
      // Obtener logo si existe
      let logo = e.equipo?.logo_url || 'img/logo.png';

      // Si el logo está en Storage
      if (logo.startsWith("imagenLogo/") || logo.startsWith("public/")) {
        const { data: publicUrlData } = supabase.storage.from("imagenLogo").getPublicUrl(logo);
        logo = publicUrlData.publicUrl;
      }

      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${i + 1}</td>
        <td class="equipo-cell">
          <img src="${logo}" alt="${e.equipo?.nombre}" class="logo-tabla" />
          <span>${e.equipo?.nombre}</span>
        </td>
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
