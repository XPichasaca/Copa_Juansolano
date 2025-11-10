import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://ghstgwywcaxtfdyyjxli.supabase.co";
const SUPABASE_KEY = "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tbodyMasculino = document.querySelector("#tablaPosicionesMasculino tbody");
const tbodyFemenino = document.querySelector("#tablaPosicionesFemenino tbody");

async function cargarTablaPosiciones() {
  try {
    // 1️⃣ Obtener todos los partidos con info de equipos
    const { data: partidos, error: partidosError } = await supabase
      .from("partidos")
      .select(`
        id,
        categoria,
        estado,
        marcador_local,
        marcador_visitante,
        equipo_local:equipo_local_id(id, nombre, logo_url),
        equipo_visitante:equipo_visitante_id(id, nombre, logo_url)
      `);
    if (partidosError) throw partidosError;

    // 2️⃣ Separar masculino y femenino
    const categorias = { masculino: {}, femenino: {} };

    partidos
      .filter(p => ["en_vivo", "finalizado"].includes(p.estado))
      .forEach(p => {
        const local = p.equipo_local;
        const visit = p.equipo_visitante;
        const gl = Number(p.marcador_local) || 0;
        const gv = Number(p.marcador_visitante) || 0;

        [ { eq: local }, { eq: visit } ].forEach(item => {
          const catObj = categorias[p.categoria];
          if (!catObj[item.eq.nombre]) {
            catObj[item.eq.nombre] = {
              equipo: item.eq.nombre,
              logo: item.eq.logo_url || 'img/logo.png',
              pj: 0,
              pg: 0,
              pe: 0,
              pp: 0,
              gf: 0,
              gc: 0,
              pts: 0
            };
          }
        });

        // Actualizar estadísticas
        categorias[p.categoria][local.nombre].pj++;
        categorias[p.categoria][visit.nombre].pj++;

        categorias[p.categoria][local.nombre].gf += gl;
        categorias[p.categoria][local.nombre].gc += gv;
        categorias[p.categoria][visit.nombre].gf += gv;
        categorias[p.categoria][visit.nombre].gc += gl;

        if (gl > gv) {
          categorias[p.categoria][local.nombre].pg++;
          categorias[p.categoria][local.nombre].pts += 3;
          categorias[p.categoria][visit.nombre].pp++;
        } else if (gl < gv) {
          categorias[p.categoria][visit.nombre].pg++;
          categorias[p.categoria][visit.nombre].pts += 3;
          categorias[p.categoria][local.nombre].pp++;
        } else {
          categorias[p.categoria][local.nombre].pe++;
          categorias[p.categoria][visit.nombre].pe++;
          categorias[p.categoria][local.nombre].pts++;
          categorias[p.categoria][visit.nombre].pts++;
        }
      });

    // 3️⃣ Función para dibujar tabla
    function dibujarTabla(tbody, equiposObj) {
      tbody.innerHTML = "";
      const tablaOrdenada = Object.values(equiposObj)
        .map(e => ({ ...e, dg: e.gf - e.gc }))
        .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

      tablaOrdenada.forEach((e, i) => {
        const fila = document.createElement("tr");
        fila.className = i === 0 ? "oro" : i === 1 ? "plata" : i === 2 ? "bronce" : "";
        fila.innerHTML = `
          <td>${i + 1}</td>
          <td><img src="${e.logo}" alt="${e.equipo}" class="logo-tabla">${e.equipo}</td>
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

    dibujarTabla(tbodyMasculino, categorias.masculino);
    dibujarTabla(tbodyFemenino, categorias.femenino);

  } catch (err) {
    console.error("Error cargando posiciones:", err);
  }
}

// Inicializar
cargarTablaPosiciones();
