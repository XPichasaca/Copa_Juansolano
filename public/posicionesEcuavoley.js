import { supabase } from "./script.js";

console.log("✅ Tabla de posiciones Ecuavóley cargada");

/* =========================
   CARGAR TABLA DE POSICIONES
   ========================= */
async function cargarTablaPosiciones(categoriaId = null) {
  let query = supabase
    .from("olimpiadas_resultados_ecuavoley")
    .select(`
      id,
      equipo_1_id,
      equipo_2_id,
      categoria_id,
      set1_equipo_1,
      set1_equipo_2,
      set2_equipo_1,
      set2_equipo_2,
      set3_equipo_1,
      set3_equipo_2
    `);

  if (categoriaId) {
    query = query.eq("categoria_id", categoriaId);
  }

  const { data: partidos, error } = await query;

  if (error) {
    console.error("❌ Error cargando partidos:", error);
    return;
  }

  calcularTabla(partidos);
}

/* =========================
   CALCULAR TABLA
   ========================= */
function calcularTabla(partidos) {
  const tabla = {};

  partidos.forEach(p => {
    let setsA = 0;
    let setsB = 0;

    const sets = [
      [p.set1_equipo_1, p.set1_equipo_2],
      [p.set2_equipo_1, p.set2_equipo_2],
      [p.set3_equipo_1, p.set3_equipo_2]
    ];

    sets.forEach(([a, b]) => {
      if (a != null && b != null) {
        if (a > b) setsA++;
        if (b > a) setsB++;
      }
    });

    if (setsA < 2 && setsB < 2) return;

    if (!tabla[p.equipo_1_id]) tabla[p.equipo_1_id] = nuevoEquipo(p.equipo_1_id);
    if (!tabla[p.equipo_2_id]) tabla[p.equipo_2_id] = nuevoEquipo(p.equipo_2_id);

    const A = tabla[p.equipo_1_id];
    const B = tabla[p.equipo_2_id];

    A.pj++;
    B.pj++;

    A.sets_favor += setsA;
    A.sets_contra += setsB;

    B.sets_favor += setsB;
    B.sets_contra += setsA;

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

  pintarTablaPosiciones(Object.values(tabla));
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
   PINTAR TABLA
   ========================= */
async function pintarTablaPosiciones(data) {
  const tbody = document.getElementById("tbodyPosiciones");
  tbody.innerHTML = "";

  const { data: equipos } = await supabase
    .from("olimpiadas_equipos")
    .select("id,nombre");

  const eqMap = {};
  equipos.forEach(e => eqMap[e.id] = e.nombre);

  data
    .sort((a, b) =>
      b.puntos - a.puntos ||
      (b.sets_favor - b.sets_contra) - (a.sets_favor - a.sets_contra)
    )
    .forEach(e => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${eqMap[e.equipo_id] || e.equipo_id}</td>
        <td>${e.pj}</td>
        <td>${e.pg}</td>
        <td>${e.pp}</td>
        <td>${e.sets_favor}</td>
        <td>${e.sets_contra}</td>
        <td><strong>${e.puntos}</strong></td>
      `;
      tbody.appendChild(tr);
    });
} 

/* =========================
   INIT
   ========================= */
cargarTablaPosiciones();

// Para filtrar por categoría:
// cargarTablaPosiciones(1);

window.cargarTablaPosiciones = cargarTablaPosiciones;


