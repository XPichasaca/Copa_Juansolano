// partidosEstadistica.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ---------- CONFIG
const SUPABASE_URL = "https://djjpoztjzbigudzezjcm.supabase.co";
const SUPABASE_KEY = "sb_publishable_F0yxa4IfQfkoH74PWHk-7w_SW_fcZMY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- DOM
const partidoSelect = document.getElementById("partidoSelect");
const detallePartido = document.getElementById("detallePartido");
const localHeader = document.getElementById("localHeader");
const visitHeader = document.getElementById("visitHeader");
const tablaLocalContainer = document.getElementById("tablaLocalContainer");
const tablaVisitContainer = document.getElementById("tablaVisitContainer");
const btnGuardarLocal = document.getElementById("btnGuardarLocal");
const btnGuardarVisit = document.getElementById("btnGuardarVisit");
const selJugador = document.getElementById("selJugador");
const selEvento = document.getElementById("selEvento");
const btnRegistrarEvento = document.getElementById("btnRegistrarEvento");
const tablaEventosBody = document.querySelector("#tablaEventos tbody");
const txtObserv = document.getElementById("txtObserv");
const btnGuardarObs = document.getElementById("btnGuardarObs");
const mensajes = document.getElementById("mensajes");

const cronometroEl = document.getElementById("cronometro");
const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnFinish = document.getElementById("btnFinish");
const marcadorEl = document.getElementById("marcador");

const btnPresentaLocal = document.getElementById("btnPresentaLocal");
const btnPresentaVisit = document.getElementById("btnPresentaVisit");
const btnNoPresentaLocal = document.getElementById("btnNoPresentaLocal");
const btnNoPresentaVisit = document.getElementById("btnNoPresentaVisit");

const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// ---------- Estado
let partido = null;               
let jugadoresLocal = [];          
let jugadoresVisit = [];          
let alineacionesCache = {};       
let tiempoSegundos = 0;
let cronoInterval = null;
let marcador = { local: 0, visitante: 0 };
let equiposPresentes = { local: false, visitante: false };
let primerTiempo = true;
const tiempoTotal = 80 * 60; // 80 min
const tiempoMedio = 40 * 60;  // 40 min

// ---------- utilidades
function showMsg(text, type = "info") {
  const d = document.createElement("div");
  d.className = "alert";
  d.textContent = text;
  mensajes.prepend(d);
  setTimeout(() => d.remove(), 7000);
}
function formatoMinutoSeg(seg) {
  return `${String(Math.floor(seg/60)).padStart(2,"0")}:${String(seg%60).padStart(2,"0")}`;
}
function edadFromFecha(fechaStr) {
  if(!fechaStr) return null;
  const hoy = new Date(), fn = new Date(fechaStr);
  let edad = hoy.getFullYear() - fn.getFullYear();
  if(hoy.getMonth() < fn.getMonth() || (hoy.getMonth()===fn.getMonth() && hoy.getDate()<fn.getDate())) edad--;
  return edad;
}
function esEspecialPorCategoria(categoria, edad) {
  if(edad === null) return false;
  const cat = (categoria||"").toLowerCase();
  if(cat.includes("masculino")) return edad < 15 || edad > 50;
  if(cat.includes("femenino")) return edad < 15 || edad > 45;
  return edad < 15 || edad > 50;
}

// ---------- pestañas
tabBtns.forEach(b => b.addEventListener("click", () => {
  tabContents.forEach(c => c.classList.remove("active"));
  document.getElementById(b.dataset.tab).classList.add("active");
}));

// ---------- cargar partidos pendientes
async function loadPartidos() {
  const { data, error } = await supabase.from("partidos")
    .select(`
      id, fecha, categoria, estado, marcador_local, marcador_visitante,
      equipo_local:equipo_local_id (id,nombre),
      equipo_visitante:equipo_visitante_id (id,nombre)
    `)
    .eq("estado", "pendiente")
    .order("fecha", { ascending: true });

  if(error) { console.error(error); partidoSelect.innerHTML = `<option>Error cargando partidos</option>`; return; }
  if(!data || data.length === 0) { partidoSelect.innerHTML = `<option>No hay partidos pendientes</option>`; return; }

  partidoSelect.innerHTML = `<option value="">-- Seleccione partido --</option>`;
  data.forEach(p => {
    const opt = document.createElement("option");
    opt.value = JSON.stringify(p);
    opt.textContent = `${p.equipo_local?.nombre || 'Local'} vs ${p.equipo_visitante?.nombre || 'Visitante'} — ${new Date(p.fecha).toLocaleString()}`;
    partidoSelect.appendChild(opt);
  });
}

// ---------- al seleccionar partido
partidoSelect.addEventListener("change", async () => {
  if(!partidoSelect.value) return;
  partido = JSON.parse(partidoSelect.value);

  detallePartido.innerHTML = `<div class="small"><strong>Categoría:</strong> ${partido.categoria}</div>`;
  localHeader.textContent = partido.equipo_local?.nombre || "Local";
  visitHeader.textContent = partido.equipo_visitante?.nombre || "Visitante";

  marcador.local = partido.marcador_local || 0;
  marcador.visitante = partido.marcador_visitante || 0;
  marcadorEl.textContent = `${marcador.local} - ${marcador.visitante}`;

  tiempoSegundos = 0;
  primerTiempo = true;
  cronometroEl.textContent = formatoMinutoSeg(tiempoSegundos);
  equiposPresentes = { local: false, visitante: false };

  await loadJugadores(partido.equipo_local?.id, partido.equipo_visitante?.id);
  await loadAlineaciones(partido.id);
  renderNominaTables();
  populateJugadorSelect();
  renderEventosHistory();
});

// ---------- cargar jugadores
async function loadJugadores(localId, visitId) {
  jugadoresLocal = []; jugadoresVisit = [];
  if(!localId || !visitId) return;
  const { data, error } = await supabase.from("jugadores")
    .select("*")
    .in("equipo_id", [localId, visitId])
    .order("dorsal", { ascending: true });
  if(error) { console.error(error); showMsg("Error cargando jugadores"); return; }

  data.forEach(j => {
    const edad = edadFromFecha(j.fecha_nacimiento);
    const _esEspecial = esEspecialPorCategoria(partido.categoria, edad);
    const obj = { ...j, _edad: edad, _esEspecial };
    if(j.equipo_id === localId) jugadoresLocal.push(obj);
    else jugadoresVisit.push(obj);
  });
}

// ---------- render tabla nómina
function renderNominaTables() {
  tablaLocalContainer.innerHTML = createNominaTableHTML(jugadoresLocal, "local");
  tablaVisitContainer.innerHTML = createNominaTableHTML(jugadoresVisit, "visit");
  document.querySelectorAll(".chkTit").forEach(c => c.addEventListener("change", onTipoChange));
  document.querySelectorAll(".chkSup").forEach(c => c.addEventListener("change", onTipoChange));
}

function createNominaTableHTML(list, equipo) {
  let html = `<table><thead><tr><th>Dorsal</th><th>Nombre</th><th>Edad</th><th>Especial</th><th>Titular</th><th>Suplente</th></tr></thead><tbody>`;
  list.forEach(j => {
    html += `<tr data-id="${j.id}" class="${j._esEspecial?'especial':''}">
      <td>${j.dorsal ?? ""}</td>
      <td>${j.nombre}</td>
      <td>${j._edad ?? "-"}</td>
      <td>${j._esEspecial?"⭐":""}</td>
      <td style="text-align:center"><input type="checkbox" class="chkTit" data-id="${j.id}" data-equipo="${equipo}"></td>
      <td style="text-align:center"><input type="checkbox" class="chkSup" data-id="${j.id}" data-equipo="${equipo}"></td>
    </tr>`;
  });
  html += "</tbody></table>";
  return html;
}

function onTipoChange(e) {
  const chk = e.target;
  const tipo = chk.classList.contains("chkTit") ? "titular" : "suplente";
  const equipo = chk.dataset.equipo;
  const arr = equipo === "local" ? jugadoresLocal : jugadoresVisit;
  if(tipo === "titular" && chk.checked) {
    // máximo 11 titulares
    if(arr.filter(j => j.tipo === "titular").length >= 11) { chk.checked=false; showMsg("Máximo 11 titulares"); return; }
  }
  if(tipo === "suplente" && chk.checked) {
    if(arr.filter(j => j.tipo === "suplente").length >= 7) { chk.checked=false; showMsg("Máximo 7 suplentes"); return; }
  }
  const j = arr.find(j => j.id == chk.dataset.id);
  if(j) j.tipo = chk.checked ? tipo : null;
}

// ---------- guardar nómina
btnGuardarLocal.addEventListener("click", ()=>guardarNomina("local"));
btnGuardarVisit.addEventListener("click", ()=>guardarNomina("visit"));

async function guardarNomina(equipo) {
  const arr = equipo==="local"? jugadoresLocal : jugadoresVisit;
  const tit = arr.filter(j=>j.tipo==="titular");
  const sup = arr.filter(j=>j.tipo==="suplente");
  if(tit.length>11 || sup.length>7){ showMsg("Verifica nómina"); return; }
  try {
    // borrar alineación anterior
    await supabase.from("alineaciones").delete().eq("partido_id", partido.id).eq("equipo_id", equipo==="local"?partido.equipo_local.id:partido.equipo_visitante.id);
    // insertar nuevos
    const inserts = arr.filter(j=>j.tipo).map(j=>({partido_id:partido.id, equipo_id: equipo==="local"?partido.equipo_local.id:partido.equipo_visitante.id, jugador_id:j.id, tipo:j.tipo}));
    if(inserts.length) await supabase.from("alineaciones").insert(inserts);
    showMsg(`Nómina ${equipo} guardada`);
  } catch(err){ console.error(err); showMsg("Error guardando nómina"); }
}

// ---------- cargar alineaciones
async function loadAlineaciones(partidoId) {
  const { data, error } = await supabase.from("alineaciones").select("*").eq("partido_id", partidoId);
  if(error){ console.error(error); return; }
  alineacionesCache = {};
  data.forEach(a => alineacionesCache[a.jugador_id] = a.tipo);
}

// ---------- seleccionar jugador para evento
function populateJugadorSelect() {
  selJugador.innerHTML = `<option value="">--Seleccione jugador--</option>`;
  [...jugadoresLocal, ...jugadoresVisit].forEach(j=> {
    const tipo = alineacionesCache[j.id] || j.tipo || "";
    selJugador.innerHTML += `<option value="${j.id}" data-equipo="${jugadoresLocal.includes(j)?'local':'visit'}" data-tipo="${tipo}">${j.nombre} (${tipo||"no alineado"})</option>`;
  });
}

// ---------- registrar evento
btnRegistrarEvento.addEventListener("click", async ()=>{
  const jugadorId = selJugador.value;
  const evento = selEvento.value;
  if(!jugadorId || !evento){ showMsg("Seleccione jugador y evento"); return; }
  const j = [...jugadoresLocal, ...jugadoresVisit].find(x=>x.id==jugadorId);
  if(!j) return;
  try {
    await supabase.from("eventos").insert([{partido_id:partido.id, jugador_id:j.id, equipo_id:jugadoresLocal.includes(j)?partido.equipo_local.id:partido.equipo_visitante.id, tipo_evento:evento, minuto:Math.floor(tiempoSegundos/60)}]);
    if(evento==="gol") {
      if(jugadoresLocal.includes(j)) marcador.local++; else marcador.visitante++;
      marcadorEl.textContent = `${marcador.local} - ${marcador.visitante}`;
    }
    renderEventosHistory();
    showMsg("Evento registrado");
  } catch(err){ console.error(err); showMsg("Error registrando evento"); }
});

// ---------- render historial eventos
async function renderEventosHistory() {
  const { data } = await supabase.from("eventos").select("id, jugador_id, tipo_evento, minuto, jugador:jugador_id(nombre)").eq("partido_id", partido.id).order("minuto", {ascending:true});
  tablaEventosBody.innerHTML = "";
  if(!data) return;
  data.forEach(ev=>{
    const row = document.createElement("tr");
    row.innerHTML = `<td>${ev.minuto}</td><td>${ev.jugador?.nombre||''}</td><td>${ev.tipo_evento}</td>`;
    tablaEventosBody.appendChild(row);
  });
}

// ---------- observaciones
btnGuardarObs.addEventListener("click", async ()=>{
  if(!txtObserv.value.trim()) return;
  await supabase.from("partidos").update({observacion:txtObserv.value}).eq("id", partido.id);
  showMsg("Observación guardada");
});

// ---------- cronómetro
btnStart.addEventListener("click", async ()=>{
  if(!partido) return showMsg("Seleccione partido");
  if(cronoInterval) return;
  if(partido.estado==="pendiente"){
    await supabase.from("partidos").update({estado:"en_vivo"}).eq("id",partido.id);
    partido.estado="en_vivo";
    showMsg("Partido iniciado: primer tiempo");
  }
  cronoInterval = setInterval(async ()=>{
    tiempoSegundos++;
    cronometroEl.textContent = formatoMinutoSeg(tiempoSegundos);
    if(primerTiempo && tiempoSegundos===tiempoMedio){
      clearInterval(cronoInterval); cronoInterval=null;
      await supabase.from("partidos").update({estado:"entretiempo"}).eq("id",partido.id);
      partido.estado="entretiempo";
      showMsg("Fin primer tiempo: entretiempo");
      primerTiempo=false;
    }
    if(!primerTiempo && tiempoSegundos===tiempoTotal){
      clearInterval(cronoInterval); cronoInterval=null;
      await supabase.from("partidos").update({estado:"finalizado", marcador_local:marcador.local, marcador_visitante:marcador.visitante}).eq("id",partido.id);
      partido.estado="finalizado";
      showMsg("Partido finalizado");
    }
  }, 1000);
});
btnPause.addEventListener("click", ()=>{ if(cronoInterval){ clearInterval(cronoInterval); cronoInterval=null; showMsg("Cronómetro pausado"); } });

// ---------- finalizar partido manual
btnFinish.addEventListener("click", async ()=>{
  clearInterval(cronoInterval); cronoInterval=null;
  await supabase.from("partidos").update({estado:"finalizado", marcador_local:marcador.local, marcador_visitante:marcador.visitante}).eq("id",partido.id);
  showMsg("Partido finalizado manualmente");
});

// ---------- no presentación
btnNoPresentaLocal.addEventListener("click", async ()=>{
  if(!partido) return showMsg("Seleccione partido");
  marcador.local=0; marcador.visitante=3; marcadorEl.textContent=`${marcador.local} - ${marcador.visitante}`;
  await supabase.from("partidos").update({estado:"finalizado", marcador_local:0, marcador_visitante:3}).eq("id",partido.id);
  showMsg("Partido perdido para LOCAL (0-3)");
});
btnNoPresentaVisit.addEventListener("click", async ()=>{
  if(!partido) return showMsg("Seleccione partido");
  marcador.local=3; marcador.visitante=0; marcadorEl.textContent=`${marcador.local} - ${marcador.visitante}`;
  await supabase.from("partidos").update({estado:"finalizado", marcador_local:3, marcador_visitante:0}).eq("id",partido.id);
  showMsg("Partido perdido para VISITANTE (3-0)");
});

// ---------- init
loadPartidos();



<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Nómina y Estadísticas — Gestión</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <h1>Gestión de Nómina y Estadísticas</h1>

  <div class="panel">
    <div class="row">
      <label for="partidoSelect"><strong>Partido:</strong></label>
      <select id="partidoSelect"><option>Cargando partidos...</option></select>
      <div id="detallePartido" class="small"></div>
    </div>

    <div class="row">
      <div class="col">
        <strong id="nombreLocal">Equipo Local</strong>
        <div style="margin-top:6px">
          <button id="btnPresentaLocal" class="btn-primary">Marcar Presente</button>
          <button id="btnNoPresentaLocal" class="btn-danger">No Presenta (0-3)</button>
        </div>
      </div>
      <div class="col">
        <strong id="nombreVisitante">Equipo Visitante</strong>
        <div style="margin-top:6px">
          <button id="btnPresentaVisit" class="btn-primary">Marcar Presente</button>
          <button id="btnNoPresentaVisit" class="btn-danger">No Presenta (3-0)</button>
        </div>
      </div>
    </div>
  </div>

  <div class="tabs">
    <button class="tab-btn" data-tab="tabNomina">Nómina</button>
    <button class="tab-btn" data-tab="tabEstadisticas">Estadísticas</button>
    <button class="tab-btn" data-tab="tabObserv">Observaciones</button>
  </div>

  <!-- NÓMINA -->
  <div id="tabNomina" class="tab-content active panel">
    <div class="flex">
      <div class="col">
        <h3>Local: <span id="localHeader">-</span></h3>
        <div style="margin-bottom:6px">
          <button id="btnGuardarLocal">Guardar Nómina Local</button>
          <button id="btnEditarLocal">Editar Nómina Local</button>
        </div>
        <div id="tablaLocalContainer"></div>
      </div>

      <div class="col">
        <h3>Visitante: <span id="visitHeader">-</span></h3>
        <div style="margin-bottom:6px">
          <button id="btnGuardarVisit">Guardar Nómina Visitante</button>
          <button id="btnEditarVisit">Editar Nómina Visitante</button>
        </div>
        <div id="tablaVisitContainer"></div>
      </div>
    </div>
  </div>

  <!-- ESTADÍSTICAS -->
  <div id="tabEstadisticas" class="tab-content panel">
    <div class="row">
      <div class="small">Cronómetro: <strong id="cronometro">00:00</strong></div>
      <div>
        <button id="btnStart" class="btn-primary">Iniciar</button>
        <button id="btnPause">Pausar</button>
        <button id="btnFinish" class="btn-danger">Finalizar</button>
      </div>
      <div class="small">Marcador: <strong id="marcador">0 - 0</strong></div>
    </div>

    <div style="margin-top:8px">
      <h4>Registrar evento manual</h4>
      <label>Jugador:</label>
      <select id="selJugador"><option value="">--Seleccione jugador--</option></select>
      <label>Evento:</label>
      <select id="selEvento">
        <option value="gol">Gol</option>
        <option value="amarilla">Amarilla</option>
        <option value="roja">Roja</option>
        <option value="entra">Entra (cambio)</option>
        <option value="sale">Sale (cambio)</option>
      </select>
      <button id="btnRegistrarEvento">Registrar</button>
    </div>

    <h4 style="margin-top:12px">Historial de eventos</h4>
    <table id="tablaEventos">
      <thead><tr><th>Min</th><th>Jugador</th><th>Equipo</th><th>Evento</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>

  <!-- OBSERVACIONES -->
  <div id="tabObserv" class="tab-content panel">
    <h4>Observaciones del partido</h4>
    <textarea id="txtObserv" placeholder="Escribe observaciones..." rows="5" style="width:100%"></textarea>
    <div style="margin-top:8px"><button id="btnGuardarObs">Guardar Observación</button></div>
  </div>

  <div id="mensajes"></div>

  <script type="module" src="./partidosEstadistica.js"></script>
  <script type="module">
    import { validarAcceso } from "./validarAcceso.js";

    validarAcceso(window.location.pathname.split("/").pop());
  </script>

</body>
</html>




import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://djjpoztjzbigudzezjcm.supabase.co";
const SUPABASE_KEY = "sb_publishable_F0yxa4IfQfkoH74PWHk-7w_SW_fcZMY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM
const partidoSelect = document.getElementById("partidoSelect");
const detallePartido = document.getElementById("detallePartido");
const localHeader = document.getElementById("localHeader");
const visitHeader = document.getElementById("visitHeader");
const tablaLocalContainer = document.getElementById("tablaLocalContainer");
const tablaVisitContainer = document.getElementById("tablaVisitContainer");
const selEquipo = document.getElementById("selEquipo");
const selJugador = document.getElementById("selJugador");
const selJugadorEntra = document.getElementById("selJugadorEntra");
const selJugadorSale = document.getElementById("selJugadorSale");
const menuEventos = document.getElementById("menuEventos");
const tablaEventosBody = document.querySelector("#tablaEventos tbody");
const resTablaLocal = document.getElementById("resTablaLocal");
const resTablaVisit = document.getElementById("resTablaVisit");
const resMarcador = document.getElementById("resMarcador");
const cronometroEl = document.getElementById("cronometro");
const mensajes = document.getElementById("mensajes");

// Estado
let partido = null;
let jugadoresLocal = [];
let jugadoresVisit = [];
let alineacionesCache = {};
let sancionados = new Set();
let eventosPartido = [];

// Cronómetro
let minutos = 0;
let cronometroInterval = null;
function actualizarCronometro() {
  const mm = String(Math.floor(minutos/60)).padStart(2,'0');
  const ss = String(minutos%60).padStart(2,'0');
  cronometroEl.textContent = `${mm}:${ss}`;
}

// Controles de cronómetro
document.getElementById('btnStart').addEventListener('click', ()=>{
  if(cronometroInterval) clearInterval(cronometroInterval);
  cronometroInterval = setInterval(()=>{
    minutos++;
    actualizarCronometro();
  },60000);
});
document.getElementById('btnPause').addEventListener('click', ()=>{ clearInterval(cronometroInterval); });
document.getElementById('btnFinish').addEventListener('click', ()=>{ clearInterval(cronometroInterval); });

// Suspensiones por tipo de evento
const SUSPENSIONES = { doble_amarilla: 1, roja_directa: 2 };

// Utilidades
function showMsg(text) {
  const d = document.createElement("div");
  d.className = "alert";
  d.textContent = text;
  mensajes.prepend(d);
  setTimeout(() => d.remove(), 5000);
}

// ---------- CARGAR PARTIDOS PENDIENTES ----------
async function loadPartidos() {
  const { data, error } = await supabase.from("partidos")
    .select(`id, fecha, categoria, estado, marcador_local, marcador_visitante,
             equipo_local:equipo_local_id(id,nombre),
             equipo_visitante:equipo_visitante_id(id,nombre)`)
    .eq("estado", "pendiente")
    .order("fecha", { ascending: true });

  if(error) { console.error(error); partidoSelect.innerHTML = `<option>Error cargando partidos</option>`; return; }
  if(!data || data.length === 0) { partidoSelect.innerHTML = `<option>No hay partidos pendientes</option>`; return; }

  partidoSelect.innerHTML = `<option value="">-- Seleccione partido --</option>`;
  data.forEach(p => {
    const opt = document.createElement("option");
    opt.value = JSON.stringify(p);
    opt.textContent = `${p.equipo_local?.nombre || 'Local'} vs ${p.equipo_visitante?.nombre || 'Visitante'} — ${new Date(p.fecha).toLocaleString()}`;
    partidoSelect.appendChild(opt);
  });
}

// --- SELECCIONAR PARTIDO ---
partidoSelect.addEventListener("change", async () => {
  if(!partidoSelect.value) return;
  partido = JSON.parse(partidoSelect.value);
  detallePartido.innerHTML = `<div class="small"><strong>Categoría:</strong> ${partido.categoria}</div>`;
  localHeader.textContent = partido.equipo_local?.nombre;
  visitHeader.textContent = partido.equipo_visitante?.nombre;

  await loadJugadores();
  await loadAlineaciones();
  await loadSancionados();
  renderNominaTables();
  populateEquipoSelect();
  populateCambioSelects();
  await renderEventosHistory();
  renderResumenPartido();
});

// --- CARGA DE JUGADORES ---
async function loadJugadores() {
  jugadoresLocal = [];
  jugadoresVisit = [];
  const { data } = await supabase.from("jugadores")
    .select("*")
    .in("equipo_id", [partido.equipo_local.id, partido.equipo_visitante.id])
    .order("dorsal", { ascending:true });

  data.forEach(j=>{
    if(j.equipo_id===partido.equipo_local.id) jugadoresLocal.push(j);
    else jugadoresVisit.push(j);
  });
}

// --- CARGA DE ALINEACIONES ---
async function loadAlineaciones() {
  alineacionesCache = {};
  const { data } = await supabase.from("alineaciones").select("*").eq("partido_id",partido.id);
  data?.forEach(a => alineacionesCache[a.jugador_id] = a);
}

// --- CARGA DE JUGADORES SANCIONADOS ---
async function loadSancionados() {
  sancionados = new Set();
  const { data } = await supabase.from("vista_sanciones_activas").select("jugador_id");
  data?.forEach(s => sancionados.add(s.jugador_id));
}

// --- RENDER NÓMINA ---
function renderNominaTables() {
  function crearTabla(jugadores){
    return `<table>
      <thead><tr><th>Dorsal</th><th>Jugador</th><th>Titular</th><th>Suplente</th></tr></thead>
      <tbody>${jugadores.map(j=>`
        <tr>
          <td>${j.dorsal}</td>
          <td>${j.nombre} ${sancionados.has(j.id)?'(Sancionado)':''}</td>
          <td><input type="checkbox" ${alineacionesCache[j.id]?.titular?'checked':''} ${sancionados.has(j.id)?'disabled':''}></td>
          <td><input type="checkbox" ${alineacionesCache[j.id]?.suplente?'checked':''} ${sancionados.has(j.id)?'disabled':''}></td>
        </tr>`).join('')}</tbody>
    </table>`;
  }
  tablaLocalContainer.innerHTML = crearTabla(jugadoresLocal);
  tablaVisitContainer.innerHTML = crearTabla(jugadoresVisit);
}

// --- POBLAR SELECT DE EQUIPO ---
function populateEquipoSelect(){
  selEquipo.innerHTML = `<option value="">--Seleccione equipo--</option>
    <option value="local">${partido.equipo_local.nombre}</option>
    <option value="visitante">${partido.equipo_visitante.nombre}</option>`;
  selJugador.innerHTML = `<option value="">--Seleccione jugador--</option>`;
}

// --- POBLAR SELECTS DE CAMBIO ---
function populateCambioSelects(){
  selJugadorEntra.innerHTML = `<option value="">--Seleccione--</option>`;
  selJugadorSale.innerHTML = `<option value="">--Seleccione--</option>`;
  jugadoresLocal.concat(jugadoresVisit).forEach(j=>{
    const opt1 = document.createElement('option'); opt1.value = j.id; opt1.textContent = j.nombre; selJugadorEntra.appendChild(opt1);
    const opt2 = document.createElement('option'); opt2.value = j.id; opt2.textContent = j.nombre; selJugadorSale.appendChild(opt2);
  });
}

// --- FILTRAR JUGADORES POR EQUIPO ---
selEquipo.addEventListener("change", ()=>{
  const equipo = selEquipo.value;
  selJugador.innerHTML = `<option value="">--Seleccione jugador--</option>`;
  let jugadores = [];
  if(equipo==="local") jugadores = jugadoresLocal.filter(j => alineacionesCache[j.id]?.titular || alineacionesCache[j.id]?.suplente);
  else if(equipo==="visitante") jugadores = jugadoresVisit.filter(j => alineacionesCache[j.id]?.titular || alineacionesCache[j.id]?.suplente);
  jugadores.forEach(j=>{
    const opt = document.createElement("option");
    opt.value = j.id;
    opt.textContent = j.nombre;
    selJugador.appendChild(opt);
  });
});

// --- REGISTRAR EVENTO ---
menuEventos.querySelectorAll("button").forEach(btn=>{
  btn.addEventListener("click", async ()=>{
    const jugador_id = parseInt(selJugador.value);
    if(!jugador_id) return showMsg("Selecciona jugador");

    const tipo = btn.dataset.evento; 
    let por_jugador_id = null;
    const minuto = minutos;

    // --- Validar tarjetas ---
    if(tipo==="amarilla" || tipo==="roja"){
      const tarjetas = eventosPartido.filter(e=>e.jugador_id===jugador_id && ["amarilla","roja_directa","roja_doble_amarilla"].includes(e.tipo_evento));
      const amarillas = tarjetas.filter(e=>e.tipo_evento==="amarilla").length;
      const rojas = tarjetas.filter(e=>["roja_directa","roja_doble_amarilla"].includes(e.tipo_evento)).length;

      if(tipo==="amarilla"){
        if(amarillas>=2 || rojas>=1) return showMsg("No puede recibir más tarjetas");
        if(amarillas===1){
          await supabase.from("estadisticas").insert([{partido_id:partido.id,jugador_id,tipo_evento:"roja_doble_amarilla",minuto,por_jugador_id:null}]);
          await supabase.from("sanciones").insert([{jugador_id,partido_id:partido.id,tipo:"doble_amarilla",partidos_suspendidos:SUSPENSIONES.doble_amarilla}]);
          showMsg("Segunda amarilla → Roja doble amarilla ⚠️");
          await loadSancionados(); renderNominaTables(); await renderEventosHistory(); renderResumenPartido();
          return;
        }
      }
      if(tipo==="roja" && rojas>=1) return showMsg("Jugador ya tiene roja");
    }

    // --- Cambios ---
    if(tipo==="entra" || tipo==="sale"){
      const selPor = tipo==="entra"?selJugadorSale:selJugadorEntra;
      if(selPor.value) por_jugador_id = parseInt(selPor.value);
    }

    // --- Insertar evento ---
    const { error } = await supabase.from("estadisticas").insert([{partido_id:partido.id,jugador_id,tipo_evento:tipo,minuto,por_jugador_id}]);
    if(error){ console.error(error); return showMsg("Error registrando evento"); }

    // --- Insertar sanción roja directa ---
    if(tipo==="roja"){
      await supabase.from("sanciones").insert([{jugador_id,partido_id:partido.id,tipo:"roja_directa",partidos_suspendidos:SUSPENSIONES.roja_directa}]);
    }

    await loadSancionados(); renderNominaTables(); await renderEventosHistory(); renderResumenPartido();
  });
});

// --- HISTORIAL DE EVENTOS ---
async function renderEventosHistory(){
  const { data } = await supabase.from("estadisticas")
    .select(`*, jugador:jugador_id(nombre)`)
    .eq("partido_id",partido.id)
    .order("minuto",{ascending:true});
  eventosPartido = data || [];

  tablaEventosBody.innerHTML = eventosPartido.map(ev=>{
    const equipo = jugadoresLocal.some(j=>j.id===ev.jugador_id)?"Local":"Visitante";
    const jugadorNombre = ev.jugador?.nombre || ev.jugador_id;
    return `<tr><td>${ev.minuto}</td><td>${jugadorNombre}</td><td>${equipo}</td><td>${ev.tipo_evento}</td></tr>`;
  }).join('');
}

// --- RENDER RESUMEN ---
function renderResumenPartido(){
  function contar(evts, jugadorId, tipo){ return evts.filter(e=>e.jugador_id===jugadorId && e.tipo_evento===tipo).length; }

  function tarjetas(jugadorId) {
    const evts = eventosPartido.filter(e => e.jugador_id === jugadorId);
    const amarillas = evts.filter(e => e.tipo_evento === "amarilla").length;
    const rojaDirecta = evts.some(e => e.tipo_evento === "roja_directa");
    const rojaDoble = evts.some(e => e.tipo_evento === "roja_doble_amarilla");
    if (rojaDoble) return "🟨🟨🟥";
    if (rojaDirecta) return "🟥";
    if (amarillas === 2) return "🟨🟨";
    if (amarillas === 1) return "🟨";
    return "";
  }

  function cambios(evts,jugadorId){
    return evts.filter(e=>['entra','sale'].includes(e.tipo_evento) && e.jugador_id===jugadorId)
      .map(e=>`${e.tipo==='entra'?'↑':'↓'}(${e.minuto}' por ${e.por_jugador_id||'-'})`).join(' ');
  }

  function crearTabla(jugadores){
    return `<table>
      <thead><tr><th>Jugador</th><th>Dorsal</th><th>Gol</th><th>Tarjetas</th><th>Entra</th><th>Sale</th></tr></thead>
      <tbody>${jugadores.map(j=>`<tr>
        <td>${j.nombre}</td>
        <td>${j.dorsal}</td>
        <td>${'⚽'.repeat(contar(eventosPartido,j.id,'gol'))}</td>
        <td style="white-space:pre-line">${tarjetas(j.id)}</td>
        <td>${cambios(eventosPartido.filter(e=>e.tipo==='entra'),j.id)}</td>
        <td>${cambios(eventosPartido.filter(e=>e.tipo==='sale'),j.id)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  resTablaLocal.innerHTML = crearTabla(jugadoresLocal);
  resTablaVisit.innerHTML = crearTabla(jugadoresVisit);

  const golesLocal = eventosPartido.filter(e=>jugadoresLocal.some(j=>j.id===e.jugador_id) && e.tipo_evento==='gol').length;
  const golesVisit = eventosPartido.filter(e=>jugadoresVisit.some(j=>j.id===e.jugador_id) && e.tipo_evento==='gol').length;
  resMarcador.textContent = `${golesLocal} - ${golesVisit}`;
}

// ---------- INICIAL ----------
loadPartidos();
