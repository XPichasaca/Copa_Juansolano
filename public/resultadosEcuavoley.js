import { supabase } from "./script.js";

console.log("✅ resultadosEcuavoley.js cargado");

/* =========================
   CARGAR CATEGORÍAS ECUAVOLEY
   ========================= */
async function cargarCategorias() {
  const { data, error } = await supabase
    .from("olimpiadas_categorias")
    .select("id, nombre")
    .eq("disciplina", "Ecuavoley")
    .order("nombre");

  if (error) {
    console.error("Error cargando categorías:", error);
    return;
  }

  const select = document.getElementById("filtroCategoria");
  if (!select) return;

  select.innerHTML = `<option value="">Todas</option>`;
  data.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.nombre;
    select.appendChild(opt);
  });
}

/* =========================
   CARGAR PARTIDOS
   ========================= */
async function cargarPartidos(categoriaId = null) {
  let query = supabase
    .from("olimpiadas_resultados_ecuavoley")
    .select(`
      id,
      fecha_partido,
      categoria_id,
      set1_equipo_1,
      set1_equipo_2,
      set2_equipo_1,
      set2_equipo_2,
      set3_equipo_1,
      set3_equipo_2,
      equipo1:equipo_1_id ( nombre, logo ),
      equipo2:equipo_2_id ( nombre, logo )
    `)
    .order("fecha_partido");

  if (categoriaId) {
    query = query.eq("categoria_id", categoriaId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error cargando partidos:", error);
    return;
  }

  pintarTabla(data);
}

/* =========================
   PINTAR TABLA RESULTADOS
   ========================= */
function pintarTabla(partidos) {
  const tbody = document.getElementById("tbodyResultados");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (partidos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11">No hay partidos</td></tr>`;
    return;
  }

  partidos.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(p.fecha_partido).toLocaleString()}</td>

      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          <img src="${p.equipo1?.logo || ""}" width="30"
               onerror="this.style.display='none'">
          ${p.equipo1?.nombre || ""}
        </div>
      </td>

      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          <img src="${p.equipo2?.logo || ""}" width="30"
               onerror="this.style.display='none'">
          ${p.equipo2?.nombre || ""}
        </div>
      </td>

      <td><input type="number" id="s1a-${p.id}" value="${p.set1_equipo_1 ?? ""}" min="0"></td>
      <td><input type="number" id="s1b-${p.id}" value="${p.set1_equipo_2 ?? ""}" min="0"></td>

      <td><input type="number" id="s2a-${p.id}" value="${p.set2_equipo_1 ?? ""}" min="0"></td>
      <td><input type="number" id="s2b-${p.id}" value="${p.set2_equipo_2 ?? ""}" min="0"></td>

      <td><input type="number" id="s3a-${p.id}" value="${p.set3_equipo_1 ?? ""}" min="0"></td>
      <td><input type="number" id="s3b-${p.id}" value="${p.set3_equipo_2 ?? ""}" min="0"></td>

      <td>
        <button onclick="guardarResultado(${p.id})">💾 Guardar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* =========================
   GUARDAR RESULTADO
   ========================= */
async function guardarResultado(id) {
  const s1a = getVal(`s1a-${id}`);
  const s1b = getVal(`s1b-${id}`);
  const s2a = getVal(`s2a-${id}`);
  const s2b = getVal(`s2b-${id}`);
  const s3a = getVal(`s3a-${id}`);
  const s3b = getVal(`s3b-${id}`);

  if (s1a === null || s1b === null || s2a === null || s2b === null) {
    alert("Debe ingresar los 2 primeros sets");
    return;
  }

  let ganaA = 0, ganaB = 0;
  if (s1a > s1b) ganaA++; else ganaB++;
  if (s2a > s2b) ganaA++; else ganaB++;

  if (ganaA !== ganaB && (s3a !== null || s3b !== null)) {
    alert("No hay empate, el tercer set no aplica");
    return;
  }

  if (ganaA === ganaB && (s3a === null || s3b === null)) {
    alert("Hay empate, debe ingresar el tercer set");
    return;
  }

  const payload = {
    set1_equipo_1: s1a,
    set1_equipo_2: s1b,
    set2_equipo_1: s2a,
    set2_equipo_2: s2b,
    set3_equipo_1: s3a,
    set3_equipo_2: s3b
  };

  const { error } = await supabase
    .from("olimpiadas_resultados_ecuavoley")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("❌ Error guardando resultado");
  } else {
    alert("✅ Resultado guardado");
  }
}

function getVal(id) {
  const el = document.getElementById(id);
  if (!el || el.value === "") return null;
  return parseInt(el.value);
}

window.guardarResultado = guardarResultado;

/* =========================
   FILTRO POR CATEGORÍA
   ========================= */
document.getElementById("filtroCategoria")
  ?.addEventListener("change", e => {
    cargarPartidos(e.target.value || null);
  });

/* =========================
   INIT
   ========================= */
async function initResultadosEcuavoley() {
  await cargarCategorias();
  await cargarPartidos();
  console.log("✅ Resultados Ecuavóley listos");
}

initResultadosEcuavoley();
