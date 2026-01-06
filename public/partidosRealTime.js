import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ghstgwywcaxtfdyyjxli.supabase.co";
const SUPABASE_KEY = "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tbodyMasculino = document.querySelector("#tablaPosicionesMasculino tbody");
const tbodyFemenino = document.querySelector("#tablaPosicionesFemenino tbody");

window.tablaPosicionesMasculino = [];
window.tablaPosicionesFemenino = [];

async function cargarTablaPosiciones() {
  try {
    const { data: partidos, error } = await supabase
      .from("partidos")
      .select(`
        id,
        categoria,
        fase,
        estado,
        marcador_local,
        marcador_visitante,
        equipo_local:equipo_local_id(id, nombre, logo_url),
        equipo_visitante:equipo_visitante_id(id, nombre, logo_url)
      `);

    if (error) throw error;

    const categorias = { masculino: {}, femenino: {} };

    partidos
      .filter(p =>
        ["en_vivo", "finalizado"].includes(p.estado) &&
        p.fase === "grupos"
      )
      .forEach(p => {
        const local = p.equipo_local;
        const visit = p.equipo_visitante;
        const gl = Number(p.marcador_local) || 0;
        const gv = Number(p.marcador_visitante) || 0;

        [local, visit].forEach(eq => {
          if (!categorias[p.categoria][eq.id]) {
            categorias[p.categoria][eq.id] = {
              equipo_id: eq.id,
              equipo: eq.nombre,
              logo: eq.logo_url || "img/logo.png",
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

        categorias[p.categoria][local.id].pj++;
        categorias[p.categoria][visit.id].pj++;

        categorias[p.categoria][local.id].gf += gl;
        categorias[p.categoria][local.id].gc += gv;
        categorias[p.categoria][visit.id].gf += gv;
        categorias[p.categoria][visit.id].gc += gl;

        if (gl > gv) {
          categorias[p.categoria][local.id].pg++;
          categorias[p.categoria][local.id].pts += 3;
          categorias[p.categoria][visit.id].pp++;
        } else if (gl < gv) {
          categorias[p.categoria][visit.id].pg++;
          categorias[p.categoria][visit.id].pts += 3;
          categorias[p.categoria][local.id].pp++;
        } else {
          categorias[p.categoria][local.id].pe++;
          categorias[p.categoria][visit.id].pe++;
          categorias[p.categoria][local.id].pts++;
          categorias[p.categoria][visit.id].pts++;
        }
      });

    function dibujarTabla(tbody, equiposObj, categoria) {
      tbody.innerHTML = "";

      const tablaOrdenada = Object.values(equiposObj)
        .map(e => ({ ...e, dg: e.gf - e.gc }))
        .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

      if (categoria === "masculino") {
        window.tablaPosicionesMasculino = tablaOrdenada;
      } else {
        window.tablaPosicionesFemenino = tablaOrdenada;
      }

      tablaOrdenada.forEach((e, i) => {
        const fila = document.createElement("tr");
        fila.className =
          i === 0 ? "oro" :
          i === 1 ? "plata" :
          i === 2 ? "bronce" : "";

        fila.innerHTML = `
          <td>${i + 1}</td>
          <td>
            <img src="${e.logo}" class="logo-tabla">
            ${e.equipo}
          </td>
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

    dibujarTabla(tbodyMasculino, categorias.masculino, "masculino");
    dibujarTabla(tbodyFemenino, categorias.femenino, "femenino");

  } catch (err) {
    console.error("Error cargando posiciones:", err);
  }
}

cargarTablaPosiciones();
