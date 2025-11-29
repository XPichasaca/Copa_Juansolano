import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://tu-proyecto.supabase.co";
const SUPABASE_KEY = "sb_publishable_..."; // tu clave pública
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// === Obtener rango de la semana actual (lunes a domingo) ===
function obtenerRangoSemana() {
  const hoy = new Date();

  // lunes
  const inicio = new Date(hoy);
  const dia = hoy.getDay(); // 0 domingo
  const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1);
  inicio.setDate(diff);
  inicio.setHours(0, 0, 0, 0);

  // domingo
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);
  fin.setHours(23, 59, 59, 999);

  return { inicio, fin };
}

// === Cargar partidos de esta semana ===
async function cargarPartidosPublicoSemana() {
  const cont = document.getElementById("cardsEcuavoleyPublico");
  cont.innerHTML = "<p>Cargando...</p>";

  const { inicio, fin } = obtenerRangoSemana();

  // Obtener partidos de la semana
  const { data: partidos, error } = await supabase
    .from("olimpiadas_resultados_ecuavoley")
    .select("*")
    .gte("fecha_partido", inicio.toISOString())
    .lte("fecha_partido", fin.toISOString())
    .order("fecha_partido", { ascending: true });

  if (error) {
    cont.innerHTML = "<p>Error cargando partidos</p>";
    return;
  }

  // Obtener mapas de relaciones
  const { data: equipos } = await supabase
    .from("olimpiadas_equipos")
    .select("id, nombre, logo");

  const { data: categorias } = await supabase
    .from("olimpiadas_categorias")
    .select("id, nombre");

  const eqMap = Object.fromEntries(equipos.map(e => [e.id, e]));
  const catMap = Object.fromEntries(categorias.map(c => [c.id, c.nombre]));

  // Agrupar por día
  const dias = {};

  partidos.forEach(p => {
    const f = new Date(p.fecha_partido);
    const fechaTexto = f.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    const clave = f.toISOString().split("T")[0];

    if (!dias[clave]) dias[clave] = { texto: fechaTexto, partidos: [] };
    dias[clave].partidos.push(p);
  });

  cont.innerHTML = "";

  // Renderizar días en orden
  for (const clave of Object.keys(dias).sort()) {
    const dia = dias[clave];

    const titulo = document.createElement("h2");
    titulo.textContent = `📆 ${capitalizar(dia.texto)}`;
    titulo.className = "dia-titulo";
    cont.appendChild(titulo);

    dia.partidos.forEach(p => renderCard(p, cont, eqMap, catMap));
  }
}

// === Render de cada tarjeta ===
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

// Ejecutar
cargarPartidosPublicoSemana();
