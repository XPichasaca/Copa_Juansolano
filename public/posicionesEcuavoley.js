import { supabase } from "./script.js";

console.log("✅ Tablas de posiciones por categoría (Ecuavóley)");

/* =========================
   CARGAR TODAS LAS CATEGORÍAS
   ========================= */
async function cargarTodasLasCategorias() {
  const { data: categorias, error } = await supabase
    .from("olimpiadas_categorias")
    .select("id, nombre")
    .eq("disciplina", "Ecuavoley")
    .order("nombre");

  if (error) {
    console.error(error);
    return;
  }

  const contenedor = document.getElementById("contenedorTablas");
  contenedor.innerHTML = "";

  for (const categoria of categorias) {
    await cargarTablaCategoria(categoria, contenedor);
  }
}

/* =========================
   CARGAR TABLA POR CATEGORÍA
   ========================= */
async function cargarTablaCategoria(categoria, contenedor) {
  const { data: partidos, error } = await supabase
    .from("olimpiadas_resultados_ecuavoley")
    .select(`
      equipo_1_id,
      equipo_2_id,
      set1_equipo_1,
      set1_equipo_2,
      set2_equipo_1,
      set2_equipo_2,
      set3_equipo_1,
      set3_equipo_2
    `)
    .eq("categoria_id", categoria.id);

  if (error || !partidos || partidos.length === 0) return;

  const tabla = calcularTabla(partidos);

  if (tabla.length === 0) return;

  await pintarTablaCategoria(categoria.nombre, tabla, contenedor);
}

/* =========================
   CALCULAR TABLA (LÓGICA CORRECTA)
   ========================= */
function calcularTabla(partidos) {
  const tabla = {};

  partidos.forEach(p => {
    const sets = [
      [p.set1_equipo_1, p.set1_equipo_2],
      [p.set2_equipo_1, p.set2_equipo_2],
      [p.set3_equipo_1, p.set3_equipo_2]
    ];

    // 🔍 ¿Tiene al menos un set ingresado?
    const tieneDatos = sets.some(
      ([a, b]) => a !== null && b !== null
    );

    // ❌ Partido NO jugado → ignorar
    if (!tieneDatos) return;

    if (!tabla[p.equipo_1_id]) tabla[p.equipo_1_id] = nuevoEquipo(p.equipo_1_id);
    if (!tabla[p.equipo_2_id]) tabla[p.equipo_2_id] = nuevoEquipo(p.equipo_2_id);

    const A = tabla[p.equipo_1_id];
    const B = tabla[p.equipo_2_id];

    // ✅ Partido jugado → suma PJ
    A.pj++;
    B.pj++;

    // 🚫 NO PRESENTACIÓN (0–0 / 0–0)
    const noPresentacion = sets.every(
      ([a, b]) => a === 0 && b === 0
    );

    if (noPresentacion) return;

    let setsA = 0;
    let setsB = 0;

    sets.forEach(([a, b]) => {
      if (a != null && b != null) {
        if (a > b) setsA++;
        else if (b > a) setsB++;
      }
    });

    A.sets_favor += setsA;
    A.sets_contra += setsB;
    B.sets_favor += setsB;
    B.sets_contra += setsA;

    // 🏐 Sistema de puntos Ecuavóley
    if (setsA === 2 && setsB === 0) {
      A.pg++; B.pp++;
      A.puntos += 3;
    } else if (setsA === 2 && setsB === 1) {
      A.pg++; B.pp++;
      A.puntos += 2;
      B.puntos += 1;
    } else if (setsB === 2 && setsA === 0) {
      B.pg++; A.pp++;
      B.puntos += 3;
    } else if (setsB === 2 && setsA === 1) {
      B.pg++; A.pp++;
      B.puntos += 2;
      A.puntos += 1;
    }
  });

  return Object.values(tabla).sort(
    (a, b) =>
      b.puntos - a.puntos ||
      (b.sets_favor - b.sets_contra) - (a.sets_favor - a.sets_contra)
  );
}

/* =========================
   NUEVO EQUIPO
   ========================= */
function nuevoEquipo(id) {
  return {
    equipo_id: id,
    pj: 0,
    pg: 0,
    pp: 0,
    sets_favor: 0,
    sets_contra: 0,
    puntos: 0
  };
}

/* =========================
   PINTAR TABLA CON LOGO
   ========================= */
async function pintarTablaCategoria(nombreCategoria, tabla, contenedor) {
  const { data: equipos } = await supabase
    .from("olimpiadas_equipos")
    .select("id, nombre, logo");

  const eqMap = {};
  equipos.forEach(e => eqMap[e.id] = e);

  let html = `
    <h3>📌 ${nombreCategoria}</h3>
    <table class="tabla-posiciones">
      <thead>
        <tr>
          <th>Equipo</th>
          <th>PJ</th>
          <th>PG</th>
          <th>PP</th>
          <th>Sets +</th>
          <th>Sets -</th>
          <th>Puntos</th>
        </tr>
      </thead>
      <tbody>
  `;

  tabla.forEach(e => {
    html += `
      <tr>
        <td class="equipo">
          <img src="${eqMap[e.equipo_id]?.logo || ""}" class="logo">
          ${eqMap[e.equipo_id]?.nombre || e.equipo_id}
        </td>
        <td>${e.pj}</td>
        <td>${e.pg}</td>
        <td>${e.pp}</td>
        <td>${e.sets_favor}</td>
        <td>${e.sets_contra}</td>
        <td><strong>${e.puntos}</strong></td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <hr>
  `;

  contenedor.innerHTML += html;
}

/* =========================
   INIT
   ========================= */
cargarTodasLasCategorias();
