import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://ghstgwywcaxtfdyyjxli.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Obtener rango de la semana actual ===
function obtenerRangoSemana() {
  const hoy = new Date();
  const inicio = new Date(hoy);
  const dia = hoy.getDay(); // 0 domingo
  const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1); // lunes
  inicio.setDate(diff);
  inicio.setHours(0,0,0,0);

  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6); // domingo
  fin.setHours(23,59,59,999);

  return { inicio, fin };
}

// === Cargar partidos de sábado y domingo de esta semana ===
async function cargarJornadaEcuavoley() {
  // Apuntar al contenedor de cards públicas
  const cont = document.getElementById("cardsEcuavoleyPublico");
  cont.innerHTML = "<p>Cargando...</p>";

  const { inicio, fin } = obtenerRangoSemana();

  // Obtener partidos de esta semana
  const { data: partidos, error } = await supabase
    .from("olimpiadas_resultados_ecuavoley")
    .select("*")
    .gte("fecha_partido", inicio.toISOString())
    .lte("fecha_partido", fin.toISOString())
    .order("fecha_partido", { ascending: true });

  if (error) {
    cont.innerHTML = "<p>Error cargando partidos</p>";
    console.error(error);
    return;
  }

  // Obtener equipos y categorías
  const { data: equipos } = await supabase
    .from("olimpiadas_equipos")
    .select("id, nombre, logo");

  const { data: categorias } = await supabase
    .from("olimpiadas_categorias")
    .select("id, nombre");

  const eqMap = Object.fromEntries(equipos.map(e => [e.id, e]));
  const catMap = Object.fromEntries(categorias.map(c => [c.id, c.nombre]));

  cont.innerHTML = "";

  // Filtrar solo sábados (6) y domingos (0)
  const dias = {};
  partidos.forEach(p => {
    const fecha = new Date(p.fecha_partido);
    const diaSemana = fecha.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) return; // solo sábado/domingo

    const diaTexto = fecha.toLocaleDateString("es-ES", { weekday:'long', day:'numeric', month:'long' });
    const clave = fecha.toISOString().split("T")[0];

    if (!dias[clave]) dias[clave] = { texto: diaTexto, partidos: [] };
    dias[clave].partidos.push(p);
  });

  // Renderizar días en orden dentro de la misma cards-container
  Object.keys(dias).sort().forEach(clave => {
    const dia = dias[clave];

    const titulo = document.createElement("h3");
    titulo.textContent = `📆 ${capitalizar(dia.texto)}`;
    titulo.className = "dia-titulo";
    cont.appendChild(titulo);

    dia.partidos.forEach(p => renderCard(p, cont, eqMap, catMap));
  });
}

// === Render de tarjeta ===
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
      <img src="${eq1.logo || 'default.png'}" alt="${eq1.nombre}">
      <img src="${eq2.logo || 'default.png'}" alt="${eq2.nombre}">
    </div>

    <div class="card-team-names">
      <span>${eq1.nombre}</span>
      <span>${eq2.nombre}</span>
    </div>

    <div class="card-score">${marcador}</div>

    <div class="card-info">
      <p><strong>🏷 Categoría:</strong> ${catMap[p.categoria_id]}</p>
      <p><strong>📍 Lugar:</strong> ${p.lugar}</p>
      <p><strong>🟦 Cancha:</strong> ${p.cancha}</p>
      ${p.estado === "en_vivo" ? '<p class="en-vivo">EN VIVO 🔴</p>' : ''}
    </div>
  `;

  cont.appendChild(card);
}

function capitalizar(txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// Inicializar
cargarJornadaEcuavoley();
