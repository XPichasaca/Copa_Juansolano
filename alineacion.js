import { supabase } from "./script.js";

const selectPartido = document.getElementById("partidoSelect");
const detallesPartido = document.getElementById("detallesPartido");
const contenedorLocal = document.getElementById("jugadoresLocal");
const contenedorVisitante = document.getElementById("jugadoresVisitante");

const contTitularesLocal = document.getElementById("contTitularesLocal");
const contSuplentesLocal = document.getElementById("contSuplentesLocal");
const contTitularesVisitante = document.getElementById("contTitularesVisitante");
const contSuplentesVisitante = document.getElementById("contSuplentesVisitante");

const nombreLocal = document.getElementById("nombreLocal");
const nombreVisitante = document.getElementById("nombreVisitante");

const btnRegistrar = document.getElementById("btnRegistrarNomina");

// 🏁 1. Cargar partidos pendientes (sin hora)
async function cargarPartidosPendientes() {
  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(`
      id, fecha, estado, categoria,
      equipo_local_id, equipo_visitante_id,
      equipos_local:equipo_local_id(nombre),
      equipos_visitante:equipo_visitante_id(nombre)
    `)
    .eq("estado", "pendiente")
    .order("fecha", { ascending: true });

  if (error) return console.error(error);

  selectPartido.innerHTML = `<option value="">-- Selecciona un partido --</option>`;

  partidos.forEach(p => {
    const texto = `${p.equipos_local?.nombre || "Local"} vs ${p.equipos_visitante?.nombre || "Visitante"} - ${p.fecha}`;
    selectPartido.innerHTML += `<option value='${JSON.stringify({
      id: p.id,
      local: p.equipo_local_id,
      visitante: p.equipo_visitante_id,
      categoria: p.categoria,
      nombreLocal: p.equipos_local?.nombre,
      nombreVisitante: p.equipos_visitante?.nombre,
      fecha: p.fecha
    })}'>${texto}</option>`;
  });
}

// 👥 2. Al seleccionar un partido
selectPartido.addEventListener("change", async e => {
  const value = e.target.value;
  if (!value) {
    detallesPartido.innerHTML = "";
    contenedorLocal.innerHTML = "";
    contenedorVisitante.innerHTML = "";
    return;
  }

  const { id: partidoId, local, visitante, categoria, nombreLocal: nL, nombreVisitante: nV, fecha } = JSON.parse(value);

  // Mostrar detalles del partido
  detallesPartido.innerHTML = `
    <p><strong>Categoría:</strong> ${categoria}</p>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Partido:</strong> ${nL} vs ${nV}</p>
  `;

  nombreLocal.textContent = nL || "Equipo Local";
  nombreVisitante.textContent = nV || "Equipo Visitante";

  // Cargar jugadores de ambos equipos
  const { data: jugadores, error } = await supabase
    .from("jugadores")
    .select("id, nombre, fecha_nacimiento, equipo_id, categoria")
    .in("equipo_id", [local, visitante])
    .eq("categoria", categoria);

  if (error) return console.error(error);

  const hoy = new Date();
  jugadores.forEach(j => {
    j.edad = hoy.getFullYear() - new Date(j.fecha_nacimiento).getFullYear();
  });

  mostrarJugadores(jugadores.filter(j => j.equipo_id === local), contenedorLocal, "local");
  mostrarJugadores(jugadores.filter(j => j.equipo_id === visitante), contenedorVisitante, "visitante");
});

// 📋 3. Mostrar tabla de jugadores
function mostrarJugadores(jugadores, contenedor, tipo) {
  contenedor.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Edad</th>
          <th>Titular</th>
          <th>Suplente</th>
          <th>Goles</th>
          <th>Entra</th>
          <th>Sale</th>
          <th>TA</th>
          <th>TR</th>
        </tr>
      </thead>
      <tbody>
        ${jugadores
          .map(
            j => `
          <tr>
            <td>${j.nombre}</td>
            <td>${j.edad}</td>
            <td><input type="checkbox" class="chkTitular" data-id="${j.id}" data-tipo="${tipo}"></td>
            <td><input type="checkbox" class="chkSuplente" data-id="${j.id}" data-tipo="${tipo}"></td>
            <td><input type="number" class="gol" data-id="${j.id}" data-tipo="${tipo}" min="0" value="0" style="width:50px;"></td>
            <td><input type="number" class="entra" data-id="${j.id}" data-tipo="${tipo}" min="0" style="width:50px;"></td>
            <td><input type="number" class="sale" data-id="${j.id}" data-tipo="${tipo}" min="0" style="width:50px;"></td>
            <td><input type="checkbox" class="ta" data-id="${j.id}" data-tipo="${tipo}"></td>
            <td><input type="checkbox" class="tr" data-id="${j.id}" data-tipo="${tipo}"></td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  contenedor.querySelectorAll(".chkTitular, .chkSuplente").forEach(chk => {
    chk.addEventListener("change", actualizarContadores);
  });
}

// 🔢 4. Contar titulares y suplentes
function actualizarContadores() {
  const localesTit = [...document.querySelectorAll('.chkTitular[data-tipo="local"]:checked')].length;
  const localesSup = [...document.querySelectorAll('.chkSuplente[data-tipo="local"]:checked')].length;
  const visitTit = [...document.querySelectorAll('.chkTitular[data-tipo="visitante"]:checked')].length;
  const visitSup = [...document.querySelectorAll('.chkSuplente[data-tipo="visitante"]:checked')].length;

  contTitularesLocal.textContent = localesTit;
  contSuplentesLocal.textContent = localesSup;
  contTitularesVisitante.textContent = visitTit;
  contSuplentesVisitante.textContent = visitSup;
}

// 📝 5. Registrar nómina
async function registrarNomina() {
  const value = selectPartido.value;
  if (!value) return alert("Selecciona un partido primero.");

  const { id: partidoId } = JSON.parse(value);
  const filas = [...document.querySelectorAll("tbody tr")];

  const dataInsert = filas.map(tr => {
    const id = parseInt(tr.querySelector(".chkTitular, .chkSuplente").dataset.id);
    const tipo = tr.querySelector(".chkTitular, .chkSuplente").dataset.tipo;
    return {
      partido_id: partidoId,
      jugador_id: id,
      titular: tr.querySelector(".chkTitular").checked,
      suplente: tr.querySelector(".chkSuplente").checked,
      goles: parseInt(tr.querySelector(".gol").value) || 0,
      entra: parseInt(tr.querySelector(".entra").value) || null,
      sale: parseInt(tr.querySelector(".sale").value) || null,
      tarjeta_amarilla: tr.querySelector(".ta").checked,
      tarjeta_roja: tr.querySelector(".tr").checked,
      equipo_tipo: tipo
    };
  });

  const { error } = await supabase.from("alineaciones").insert(dataInsert);
  if (error) {
    console.error(error);
    alert("❌ Error al registrar la nómina.");
  } else {
    alert("✅ Nómina registrada correctamente.");
  }
}

btnRegistrar.addEventListener("click", registrarNomina);

// Inicializar
cargarPartidosPendientes();
