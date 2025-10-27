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
