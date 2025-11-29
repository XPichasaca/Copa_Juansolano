import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://ghstgwywcaxtfdyyjxli.supabase.co";
const SUPABASE_KEY = "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cargarResumenTabla(categoria, idTabla) {
  try {
    // ⚡ Cargar partidos
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

    // ⚡ Construir posiciones
    const posiciones = {};
    const nombresEquipos = new Set();

    partidos.forEach(p => {
      const local = p.equipo_local?.nombre || "Local";
      const visitante = p.equipo_visitante?.nombre || "Visitante";

      nombresEquipos.add(local);
      nombresEquipos.add(visitante);

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

    // ⚡ Pre-cargar logos de todos los equipos
    const { data: equiposData } = await supabase
      .from("equipos")
      .select("nombre, logo_url");

    const logos = {};
    equiposData.forEach(eq => {
      if (!eq.logo_url) logos[eq.nombre] = "img/logo.png";
      else if (eq.logo_url.startsWith("imagenLogo/") || eq.logo_url.startsWith("public/")) {
        const { data } = supabase.storage.from("imagenLogo").getPublicUrl(eq.logo_url);
        logos[eq.nombre] = data.publicUrl;
      } else {
        logos[eq.nombre] = eq.logo_url;
      }
    });

    // ⚡ Ordenar posiciones
    const tablaOrdenada = Object.values(posiciones)
      .map(e => ({ ...e, dg: e.gf - e.gc }))
      .sort((a, b) => b.pts - a.pts || b.dg - a.dg);

    const tbody = document.querySelector(`#${idTabla} tbody`);
    tbody.innerHTML = "";

    if (tablaOrdenada.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No hay datos disponibles.</td></tr>`;
      return;
    }

    // ⚡ Dibujar tabla
    let cont = 1;
    tablaOrdenada.forEach(e => {
      const logoUrl = logos[e.equipo] || "img/logo.png";
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${cont}</td>
        <td>
          <div class="equipo-con-logo">
            <img src="${logoUrl}" alt="${e.equipo}" class="logo-tabla">
            <span>${e.equipo}</span>
          </div>
        </td>
        <td>${e.pts}</td>
        <td>${e.pj}</td>
        <td>${e.dg}</td>
      `;
      tbody.appendChild(fila);
      cont++;
    });

  } catch (err) {
    console.error("❌ Error al cargar tabla resumen:", err.message);
  }
}

// 🚀 Inicial
cargarResumenTabla("masculino", "resumenTablaMasculino");
cargarResumenTabla("femenino", "resumenTablaFemenino");

// 🔁 Actualizar cada 30 segundos
setInterval(() => {
  cargarResumenTabla("masculino", "resumenTablaMasculino");
  cargarResumenTabla("femenino", "resumenTablaFemenino");
}, 30000);





