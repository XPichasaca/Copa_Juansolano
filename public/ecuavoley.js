// ecuavoley.js
// IMPORT: asume que script.js exporta `supabase`
import { supabase } from "./script.js";

/* -----------------------
   Util: format date/time para inputs
   ----------------------- */
function formatDateTimeForInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/* =========================
   Cargar combos: equipos y categorías
   ========================= */
async function cargarCombos() {
  try {
    const { data: equipos, error: errEq } = await supabase
      .from("olimpiadas_equipos")
      .select("id,nombre")
      .order("nombre", { ascending: true });

    if (errEq) throw errEq;

    const selectsEquipoIds = ["select_equipo_part", "select_equipo_a", "select_equipo_b"];
    selectsEquipoIds.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = "<option value=''>-- Seleccione --</option>";
      (equipos || []).forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.id;
        opt.textContent = e.nombre;
        sel.appendChild(opt);
      });
    });

    const { data: categorias, error: errCat } = await supabase
      .from("olimpiadas_categorias")
      .select("id,nombre")
      .order("nombre", { ascending: true });

    if (errCat) throw errCat;

    const selectsCat = ["select_categoria_part", "select_categoria_partido"];
    selectsCat.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = "<option value=''>-- Seleccione --</option>";
      (categorias || []).forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        sel.appendChild(opt);
      });
    });

    console.log("Combos cargados (equipos/categorias).");
  } catch (e) {
    console.error("Error en cargarCombos:", e);
  }
}

/* =========================
   PARTICIPANTES (CRUD)
   ========================= */
async function cargarParticipantes() {
  const tbody = document.querySelector("#tablaParticipantes tbody");
  if (!tbody) {
    console.warn("No se encontró #tablaParticipantes tbody en DOM");
    return;
  }
  tbody.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

  try {
    const { data, error } = await supabase
      .from("olimpiadas_participantes_ecuavoley")
      .select("id, nombre_completo, fecha_nacimiento, equipo_id, categoria_id")
      .order("id", { ascending: true });

    if (error) throw error;

    // map equipos y categorias para mostrar nombres
    const { data: equipos } = await supabase.from("olimpiadas_equipos").select("id,nombre");
    const eqMap = {};
    (equipos || []).forEach(e => eqMap[e.id] = e.nombre);

    const { data: categorias } = await supabase.from("olimpiadas_categorias").select("id,nombre");
    const catMap = {};
    (categorias || []).forEach(c => catMap[c.id] = c.nombre);

    if (!data || data.length === 0) {
      tbody.innerHTML = "<tr><td colspan='6'>Sin participantes</td></tr>";
      return;
    }

    tbody.innerHTML = "";
    data.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${p.nombre_completo}</td>
        <td>${p.fecha_nacimiento || ""}</td>
        <td>${eqMap[p.equipo_id] || p.equipo_id || ""}</td>
        <td>${catMap[p.categoria_id] || p.categoria_id || ""}</td>
        <td>
          <button onclick="editarParticipante(${p.id})">Editar</button>
          <button onclick="eliminarParticipante(${p.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    console.log("✅ Participantes cargados:", data.length);
  } catch (err) {
    console.error("Error cargando participantes:", err);
    tbody.innerHTML = "<tr><td colspan='6'>Error cargando</td></tr>";
  }
}
window.cargarParticipantes = cargarParticipantes;

async function guardarParticipante() {
  const nombre = document.getElementById("nombre_completo").value.trim();
  const fecha = document.getElementById("fecha_nacimiento_part").value || null;
  const equipo_id = parseInt(document.getElementById("select_equipo_part").value || "0") || null;
  const categoria_id = parseInt(document.getElementById("select_categoria_part").value || "0") || null;

  if (!nombre || !equipo_id || !categoria_id) {
    alert("Completa nombre, equipo y categoría.");
    return;
  }

  try {
    const { error } = await supabase
      .from("olimpiadas_participantes_ecuavoley")
      .insert([{ nombre_completo: nombre, fecha_nacimiento: fecha, equipo_id, categoria_id }]);

    if (error) throw error;
    resetFormParticipante();
    cargarParticipantes();
  } catch (e) {
    console.error("Error guardando participante:", e);
    alert("Error guardando participante (ver consola).");
  }
}
window.guardarParticipante = guardarParticipante;

function resetFormParticipante() {
  const ids = ["participante_id", "nombre_completo", "fecha_nacimiento_part", "select_equipo_part", "select_categoria_part"];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  if (document.getElementById("btnGuardarPart")) document.getElementById("btnGuardarPart").style.display = "inline-block";
  if (document.getElementById("btnActualizarPart")) document.getElementById("btnActualizarPart").style.display = "none";
}
window.resetFormParticipante = resetFormParticipante;

async function editarParticipante(id) {
  try {
    const { data, error } = await supabase
      .from("olimpiadas_participantes_ecuavoley")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    document.getElementById("participante_id").value = data.id;
    document.getElementById("nombre_completo").value = data.nombre_completo;
    document.getElementById("fecha_nacimiento_part").value = data.fecha_nacimiento || "";
    document.getElementById("select_equipo_part").value = data.equipo_id || "";
    document.getElementById("select_categoria_part").value = data.categoria_id || "";

    if (document.getElementById("btnGuardarPart")) document.getElementById("btnGuardarPart").style.display = "none";
    if (document.getElementById("btnActualizarPart")) document.getElementById("btnActualizarPart").style.display = "inline-block";
  } catch (err) {
    console.error("Error editarParticipante:", err);
    alert("No se pudo cargar participante (ver consola).");
  }
}
window.editarParticipante = editarParticipante;

async function actualizarParticipante() {
  const id = parseInt(document.getElementById("participante_id").value || "0");
  if (!id) return alert("Id no válido");

  const nombre = document.getElementById("nombre_completo").value.trim();
  const fecha = document.getElementById("fecha_nacimiento_part").value || null;
  const equipo_id = parseInt(document.getElementById("select_equipo_part").value || "0") || null;
  const categoria_id = parseInt(document.getElementById("select_categoria_part").value || "0") || null;

  try {
    const { error } = await supabase
      .from("olimpiadas_participantes_ecuavoley")
      .update({ nombre_completo: nombre, fecha_nacimiento: fecha, equipo_id, categoria_id })
      .eq("id", id);

    if (error) throw error;
    resetFormParticipante();
    cargarParticipantes();
  } catch (err) {
    console.error("Error actualizarParticipante:", err);
    alert("Error actualizando participante.");
  }
}
window.actualizarParticipante = actualizarParticipante;

async function eliminarParticipante(id) {
  if (!confirm("Eliminar participante?")) return;
  try {
    const { error } = await supabase.from("olimpiadas_participantes_ecuavoley").delete().eq("id", id);
    if (error) throw error;
    cargarParticipantes();
  } catch (err) {
    console.error("Error eliminando participante:", err);
    alert("No eliminado (ver consola).");
  }
}
window.eliminarParticipante = eliminarParticipante;

/* =========================
   PARTIDOS (CRUD)
   ========================= */

/*
  IMPORTANTE:
  - En tu HTML el tbody de la lista de partidos debe tener id="tabla-ecuavoley"
    (este nombre coincide con tu registro.html mostrado). Si usas otro id,
    cámbialo aquí.
*/
async function cargarPartidos() {
  const tbody = document.getElementById("tabla-ecuavoley");
  if (!tbody) {
    console.warn("No se encontró tbody #tabla-ecuavoley en DOM");
    return;
  }
  tbody.innerHTML = "<tr><td colspan='8'>Cargando...</td></tr>";

  try {
    const { data, error } = await supabase
      .from("olimpiadas_resultados_ecuavoley")
      .select("*")
      .order("fecha_partido", { ascending: true });

    if (error) throw error;
    console.log("✅ Partidos leídos:", data);

    // mapas
    const { data: equipos } = await supabase.from("olimpiadas_equipos").select("id,nombre");
    const eqMap = {};
    (equipos || []).forEach(e => eqMap[e.id] = e.nombre);

    const { data: categorias } = await supabase.from("olimpiadas_categorias").select("id,nombre");
    const catMap = {};
    (categorias || []).forEach(c => catMap[c.id] = c.nombre);

    if (!data || data.length === 0) {
      tbody.innerHTML = "<tr><td colspan='8'>Sin partidos</td></tr>";
      return;
    }

    tbody.innerHTML = "";
    data.forEach((p, idx) => {
      const sets = [
        `${p.set1_equipo_1 ?? '-'} - ${p.set1_equipo_2 ?? '-'}`,
        `${p.set2_equipo_1 ?? '-'} - ${p.set2_equipo_2 ?? '-'}`,
        (p.set3_equipo_1 != null || p.set3_equipo_2 != null) ? `${p.set3_equipo_1 ?? '-'} - ${p.set3_equipo_2 ?? '-'}` : ''
      ].filter(Boolean).join(" | ");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${new Date(p.fecha_partido).toLocaleString()}</td>
        <td>${catMap[p.categoria_id] || p.categoria_id || ''}</td>
        <td>${eqMap[p.equipo_1_id] || p.equipo_1_id}</td>
        <td>${eqMap[p.equipo_2_id] || p.equipo_2_id}</td>
        <td>${sets}</td>
        <td>${p.lugar || ''}${p.cancha ? ' / ' + p.cancha : ''}</td>
        <td>
          <button onclick="editarPartido(${p.id})">Editar</button>
          <button onclick="eliminarPartido(${p.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error cargando partidos:", err);
    tbody.innerHTML = "<tr><td colspan='8'>Error cargando</td></tr>";
  }
}
window.cargarPartidos = cargarPartidos;

function resetFormPartido() {
  const ids = ["partido_id","fecha_partido","lugar_partido","cancha_partido","select_categoria_partido","select_equipo_a","select_equipo_b","set1_a","set1_b","set2_a","set2_b","set3_a","set3_b"];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  if (document.getElementById("btnGuardarPartido")) document.getElementById("btnGuardarPartido").style.display = "inline-block";
  if (document.getElementById("btnActualizarPartido")) document.getElementById("btnActualizarPartido").style.display = "none";
}
window.resetFormPartido = resetFormPartido;

async function guardarPartido() {
  try {
    const fecha = document.getElementById("fecha_partido").value;
    const lugar = document.getElementById("lugar_partido").value || null;
    const cancha = document.getElementById("cancha_partido").value || null;
    const categoria_id = parseInt(document.getElementById("select_categoria_partido").value || "0") || null;
    const equipo_1_id = parseInt(document.getElementById("select_equipo_a").value || "0") || null;
    const equipo_2_id = parseInt(document.getElementById("select_equipo_b").value || "0") || null;

    if (!fecha || !categoria_id || !equipo_1_id || !equipo_2_id) return alert("Completa fecha, categoría y ambos equipos.");

    const payload = {
      equipo_1_id,
      equipo_2_id,
      fecha_partido: new Date(fecha).toISOString(),
      set1_equipo_1: document.getElementById("set1_a").value ? parseInt(document.getElementById("set1_a").value) : null,
      set1_equipo_2: document.getElementById("set1_b").value ? parseInt(document.getElementById("set1_b").value) : null,
      set2_equipo_1: document.getElementById("set2_a").value ? parseInt(document.getElementById("set2_a").value) : null,
      set2_equipo_2: document.getElementById("set2_b").value ? parseInt(document.getElementById("set2_b").value) : null,
      set3_equipo_1: document.getElementById("set3_a").value ? parseInt(document.getElementById("set3_a").value) : null,
      set3_equipo_2: document.getElementById("set3_b").value ? parseInt(document.getElementById("set3_b").value) : null,
      lugar,
      cancha,
      categoria_id
    };

    const { error } = await supabase.from("olimpiadas_resultados_ecuavoley").insert([payload]);
    if (error) throw error;
    resetFormPartido();
    cargarPartidos();
  } catch (err) {
    console.error("Error guardando partido:", err);
    alert("Error guardando partido (ver consola).");
  }
}
window.guardarPartido = guardarPartido;

async function editarPartido(id) {
  try {
    const { data, error } = await supabase.from("olimpiadas_resultados_ecuavoley").select("*").eq("id", id).single();
    if (error) throw error;

    document.getElementById("partido_id").value = data.id;
    document.getElementById("fecha_partido").value = formatDateTimeForInput(data.fecha_partido);
    document.getElementById("lugar_partido").value = data.lugar || "";
    document.getElementById("cancha_partido").value = data.cancha || "";
    document.getElementById("select_categoria_partido").value = data.categoria_id || "";
    document.getElementById("select_equipo_a").value = data.equipo_1_id || "";
    document.getElementById("select_equipo_b").value = data.equipo_2_id || "";
    document.getElementById("set1_a").value = data.set1_equipo_1 ?? "";
    document.getElementById("set1_b").value = data.set1_equipo_2 ?? "";
    document.getElementById("set2_a").value = data.set2_equipo_1 ?? "";
    document.getElementById("set2_b").value = data.set2_equipo_2 ?? "";
    document.getElementById("set3_a").value = data.set3_equipo_1 ?? "";
    document.getElementById("set3_b").value = data.set3_equipo_2 ?? "";

    if (document.getElementById("btnGuardarPartido")) document.getElementById("btnGuardarPartido").style.display = "none";
    if (document.getElementById("btnActualizarPartido")) document.getElementById("btnActualizarPartido").style.display = "inline-block";
  } catch (err) {
    console.error("Error editarPartido:", err);
    alert("No se pudo cargar partido (ver consola).");
  }
}
window.editarPartido = editarPartido;

async function actualizarPartido() {
  try {
    const id = parseInt(document.getElementById("partido_id").value || "0");
    if (!id) return alert("Id no válido");

    const fecha = document.getElementById("fecha_partido").value;
    const lugar = document.getElementById("lugar_partido").value || null;
    const cancha = document.getElementById("cancha_partido").value || null;
    const categoria_id = parseInt(document.getElementById("select_categoria_partido").value || "0") || null;
    const equipo_1_id = parseInt(document.getElementById("select_equipo_a").value || "0") || null;
    const equipo_2_id = parseInt(document.getElementById("select_equipo_b").value || "0") || null;

    const payload = {
      equipo_1_id,
      equipo_2_id,
      fecha_partido: new Date(fecha).toISOString(),
      set1_equipo_1: document.getElementById("set1_a").value ? parseInt(document.getElementById("set1_a").value) : null,
      set1_equipo_2: document.getElementById("set1_b").value ? parseInt(document.getElementById("set1_b").value) : null,
      set2_equipo_1: document.getElementById("set2_a").value ? parseInt(document.getElementById("set2_a").value) : null,
      set2_equipo_2: document.getElementById("set2_b").value ? parseInt(document.getElementById("set2_b").value) : null,
      set3_equipo_1: document.getElementById("set3_a").value ? parseInt(document.getElementById("set3_a").value) : null,
      set3_equipo_2: document.getElementById("set3_b").value ? parseInt(document.getElementById("set3_b").value) : null,
      lugar,
      cancha,
      categoria_id
    };

    const { error } = await supabase.from("olimpiadas_resultados_ecuavoley").update(payload).eq("id", id);
    if (error) throw error;
    resetFormPartido();
    cargarPartidos();
  } catch (err) {
    console.error("Error actualizando partido:", err);
    alert("Error actualizando partido (ver consola).");
  }
}
window.actualizarPartido = actualizarPartido;

async function eliminarPartido(id) {
  if (!confirm("Eliminar partido?")) return;
  try {
    const { error } = await supabase.from("olimpiadas_resultados_ecuavoley").delete().eq("id", id);
    if (error) throw error;
    cargarPartidos();
  } catch (err) {
    console.error("Error eliminando partido:", err);
    alert("No eliminado (ver consola).");
  }
}
window.eliminarPartido = eliminarPartido;

/* =========================
   Init
   ========================= */
async function initEcuavoley() {
  await cargarCombos();
  await cargarParticipantes();
  await cargarPartidos();
  console.log("Init Ecuavoley: OK");
}

initEcuavoley();

export { initEcuavoley }; // opcional para probar desde consola

