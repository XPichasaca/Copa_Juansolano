import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://ghstgwywcaxtfdyyjxli.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ"; // anon key pública

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


async function cargarPartidosPublico() {
  const cont = document.getElementById("cardsEcuavoleyPublico");
  cont.innerHTML = "<p>Cargando...</p>";

  // Obtener partidos
  const { data: partidos, error } = await supabase
    .from("olimpiadas_resultados_ecuavoley")
    .select("*")
    .order("fecha_partido", { ascending: true });

  if (error) {
    cont.innerHTML = "<p>Error cargando partidos</p>";
    return;
  }

  // Obtener relaciones
  const { data: equipos } = await supabase
    .from("olimpiadas_equipos")
    .select("id, nombre, logo");

  const { data: categorias } = await supabase
    .from("olimpiadas_categorias")
    .select("id, nombre");

  const eqMap = Object.fromEntries(equipos.map(e => [e.id, e]));
  const catMap = Object.fromEntries(categorias.map(c => [c.id, c.nombre]));

  cont.innerHTML = "";

  // Agrupar por día
  const dias = {};

  partidos.forEach(p => {
    const fecha = new Date(p.fecha_partido);
    const opciones = { weekday: 'long', day: 'numeric', month: 'long' };

    const diaTexto = fecha.toLocaleDateString("es-ES", opciones);
    const clave = fecha.toISOString().split("T")[0]; // yyyy-mm-dd único

    if (!dias[clave]) dias[clave] = { texto: diaTexto, partidos: [] };

    dias[clave].partidos.push(p);
  });

  // Renderizar días en orden
  for (const clave of Object.keys(dias)) {
    const dia = dias[clave];

    const titulo = document.createElement("h2");
    titulo.textContent = `📆 ${capitalizar(dia.texto)}`;
    titulo.className = "dia-titulo";
    cont.appendChild(titulo);

    dia.partidos.forEach(p => renderCard(p, cont, eqMap, catMap));
  }
}

function renderCard(p, cont, eqMap, catMap) {
  const eq1 = eqMap[p.equipo_1_id];
  const eq2 = eqMap[p.equipo_2_id];

  const marcador = `
    ${p.set1_equipo_1 ?? "-"}-${p.set1_equipo_2 ?? "-"} |
    ${p.set2_equipo_1 ?? "-"}-${p.set2_equipo_2 ?? "-"}
    ${p.set3_equipo_1 || p.set3_equipo_2 ? `| ${p.set3_equipo_1 ?? "-"}-${p.set3_equipo_2 ?? "-"}` : ""}
  `;

  const card = document.createElement("div");
  card.className = "ecuavoley-card";

  card.innerHTML = `
    <div class="card-logos">
      <img src="${eq1.logo || 'default.png'}">
      <img src="${eq2.logo || 'default.png'}">
    </div>

    <div class="card-team-names">
      <span>${eq1.nombre}</span>
      <span>${eq2.nombre}</span>
    </div>

    <div class="card-info">
      <p><strong>🏷 Categoría:</strong> ${catMap[p.categoria_id]}</p>
      <p><strong>📍 Lugar:</strong> ${p.lugar}</p>
      <p><strong>🟦 Cancha:</strong> ${p.cancha}</p>
    </div>

    <div class="card-score">${marcador}</div>
  `;

  cont.appendChild(card);
}

function capitalizar(txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

cargarPartidosPublico();
