import { supabase } from "./script.js"; 

// DOM
const formPartido = document.getElementById("formPartido");
const tablaPartidos = document.querySelector("#tablaPartidos tbody");
const togglePartido = document.getElementById("toggleFormularioPartido");
const cancelarPartido = document.getElementById("cancelarPartido");
const equipoLocalSelect = document.getElementById("equipo_local_id");
const equipoVisitanteSelect = document.getElementById("equipo_visitante_id");
const arbitroPrincipalSelect = document.getElementById("arbitro_principal_id");
const arbitroAsistente1Select = document.getElementById("arbitro_asistente_1_id");
const arbitroAsistente2Select = document.getElementById("arbitro_asistente_2_id");
const delegadoMesa1Select = document.getElementById("delegado_mesa_1_id");
const delegadoMesa2Select = document.getElementById("delegado_mesa_2_id");

// 🔄 Cargar equipos según categoría seleccionada
async function cargarEquipos(categoriaSeleccionada = "") {
  let query = supabase.from("equipos").select("id, nombre, categoria").order("nombre");

  // Si hay una categoría seleccionada, filtramos
  if (categoriaSeleccionada) {
    query = query.eq("categoria", categoriaSeleccionada);
  }

  const { data: equipos, error } = await query;

  if (error) {
    console.error("Error al cargar equipos:", error);
    return;
  }

  const equipoLocalSelect = document.getElementById("equipo_local_id");
  const equipoVisitanteSelect = document.getElementById("equipo_visitante_id");

  // Limpiar selects
  equipoLocalSelect.innerHTML = `<option value="">Seleccione equipo local</option>`;
  equipoVisitanteSelect.innerHTML = `<option value="">Seleccione equipo visitante</option>`;

  // Si no hay equipos en esa categoría
  if (!equipos.length) {
    const option = document.createElement("option");
    option.textContent = "No hay equipos disponibles";
    equipoLocalSelect.appendChild(option.cloneNode(true));
    equipoVisitanteSelect.appendChild(option.cloneNode(true));
    return;
  }

  // Agregar equipos a ambos select
  equipos.forEach(e => {
    const optLocal = document.createElement("option");
    optLocal.value = e.id;
    optLocal.textContent = e.nombre;

    const optVisitante = optLocal.cloneNode(true);

    equipoLocalSelect.appendChild(optLocal);
    equipoVisitanteSelect.appendChild(optVisitante);
  });
}


async function cargarArbitros() {
  try {
    const { data: arbitros, error } = await supabase
      .from("arbitros")  // Verifica que esta sea la tabla correcta
      .select("id, nombre")  // Verifica que estos sean los campos correctos
      .order("nombre");  // Ordena alfabéticamente por nombre

    if (error) {
      console.error("Error al cargar árbitros:", error);
      return;
    }

    if (!arbitros || arbitros.length === 0) {
      console.log("No se encontraron árbitros.");
      return;
    }

    // Limpiar las opciones de árbitros
    arbitroPrincipalSelect.innerHTML = `<option value="">Seleccione árbitro principal</option>`;
    arbitroAsistente1Select.innerHTML = `<option value="">Seleccione árbitro asistente 1</option>`;
    arbitroAsistente2Select.innerHTML = `<option value="">Seleccione árbitro asistente 2</option>`;

    // Crear las opciones para cada árbitro
    arbitros.forEach(arbitro => {
      const option = document.createElement("option");
      option.value = arbitro.id;
      option.textContent = arbitro.nombre;

      arbitroPrincipalSelect.appendChild(option.cloneNode(true));
      arbitroAsistente1Select.appendChild(option.cloneNode(true));
      arbitroAsistente2Select.appendChild(option.cloneNode(true));
    });
    
    console.log("Árbitros cargados correctamente:", arbitros);

  } catch (err) {
    console.error("Error al cargar árbitros:", err);
  }
}


async function cargarDelegados() {
  const equipoLocalId = equipoLocalSelect.value;
  const equipoVisitanteId = equipoVisitanteSelect.value;

  const { data: equipos, error } = await supabase
    .from("equipos")
    .select("id, nombre")
    .order("nombre");

  if (error) {
    console.error("Error al cargar delegados:", error);
    return;
  }

  // Limpiar opciones actuales
  delegadoMesa1Select.innerHTML = `<option value="">Seleccione delegado mesa 1</option>`;
  delegadoMesa2Select.innerHTML = `<option value="">Seleccione delegado mesa 2</option>`;

  // Filtrar equipos para excluir equipos que participan en el partido
  const equiposFiltrados = equipos.filter(equipo =>
    String(equipo.id) !== equipoLocalId && String(equipo.id) !== equipoVisitanteId
  );

  // Añadir opciones filtradas a los selects de delegados
  equiposFiltrados.forEach(equipo => {
    const option1 = document.createElement("option");
    option1.value = equipo.id;
    option1.textContent = equipo.nombre;
    delegadoMesa1Select.appendChild(option1);

    const option2 = option1.cloneNode(true);
    delegadoMesa2Select.appendChild(option2);
  });
}

// Asegúrate de llamar esta función cuando cambien los equipos local o visitante
equipoLocalSelect.addEventListener("change", cargarDelegados);
equipoVisitanteSelect.addEventListener("change", cargarDelegados);

// Y también al cargar equipos inicialmente
cargarDelegados();


// 🧾 Cargar partidos
async function cargarPartidos() {
  const { data, error } = await supabase
    .from("partidos")
    .select(`
      id,
      fecha,
      estado,
      marcador_local,
      marcador_visitante,
      equipos_local:equipo_local_id(nombre),
      equipos_visitante:equipo_visitante_id(nombre),
      categoria,
      delegado_mesa_1:delegado_mesa_1_id(nombre),
      delegado_mesa_2:delegado_mesa_2_id(nombre),
      arbitro_principal:arbitro_principal_id(nombre),
      arbitro_asistente_1:arbitro_asistente_1_id(nombre),
      arbitro_asistente_2:arbitro_asistente_2_id(nombre)
    `)
    .order("fecha", { ascending: false });

  if (error) return console.error("Error al cargar partidos:", error);

  tablaPartidos.innerHTML = "";
  data.forEach(p => {
    const local = p.equipos_local?.nombre || "Local";
    const visitante = p.equipos_visitante?.nombre || "Visitante";
    const delegado1 = p.delegado_mesa_1?.nombre || "Sin delegado";
    const delegado2 = p.delegado_mesa_2?.nombre || "Sin delegado";
    const arbitroPrincipal = p.arbitro_principal?.nombre || "Sin árbitro";
    const arbitroAsistente1 = p.arbitro_asistente_1?.nombre || "Sin árbitro";
    const arbitroAsistente2 = p.arbitro_asistente_2?.nombre || "Sin árbitro";

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.id}</td>
      <td>${local} vs ${visitante}</td>
      <td>${new Date(p.fecha).toLocaleString()}</td>
      <td>${p.marcador_local} - ${p.marcador_visitante}</td>
      <td>${p.estado}</td>
      <td>${p.categoria}</td>
      <td>${delegado1}, ${delegado2}</td>
      <td>${arbitroPrincipal}, ${arbitroAsistente1}, ${arbitroAsistente2}</td>
      <td>
        <button class="btn-iniciar" data-id="${p.id}">${p.estado === "en_vivo" ? "Finalizar" : "Iniciar"}</button>
        <button class="btn-editar" data-id="${p.id}">✏️</button>
        <button class="btn-eliminar" data-id="${p.id}">🗑️</button>
      </td>
    `;
    tablaPartidos.appendChild(fila);
  });
}

// 🆕 Guardar / actualizar partido
formPartido.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("partidoId").value;
  const partido = {
    equipo_local_id: equipoLocalSelect.value,
    equipo_visitante_id: equipoVisitanteSelect.value,
    fecha: document.getElementById("fecha").value,
    estado: document.getElementById("estado").value,
    marcador_local: parseInt(document.getElementById("marcador_local").value) || 0,
    marcador_visitante: parseInt(document.getElementById("marcador_visitante").value) || 0,
    categoria: document.getElementById("categoria").value,
    delegado_mesa_1_id: delegadoMesa1Select.value,
    delegado_mesa_2_id: delegadoMesa2Select.value,
    arbitro_principal_id: arbitroPrincipalSelect.value,
    arbitro_asistente_1_id: arbitroAsistente1Select.value,
    arbitro_asistente_2_id: arbitroAsistente2Select.value,
  };

  if (!partido.equipo_local_id || !partido.equipo_visitante_id) {
    return alert("Debe seleccionar ambos equipos.");
  }
  if (partido.equipo_local_id === partido.equipo_visitante_id) {
    return alert("El equipo local y visitante no pueden ser el mismo.");
  }

  let error;
  if (id) {
    ({ error } = await supabase.from("partidos").update(partido).eq("id", id));
  } else {
    ({ error } = await supabase.from("partidos").insert([partido]));
  }

  if (error) return alert("Error: " + error.message);

  formPartido.reset();
  document.getElementById("partidoId").value = "";
  formPartido.classList.add("hidden");
  togglePartido.textContent = "+ Agregar Partidos";
  cargarPartidos();
});

// 🗑️ Editar / eliminar / iniciar/finalizar partido
tablaPartidos.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;

  if (e.target.classList.contains("btn-eliminar")) {
    if (confirm("¿Eliminar partido?")) {
      const { error } = await supabase.from("partidos").delete().eq("id", id);
      if (error) return alert("Error: " + error.message);
      cargarPartidos();
    }
  }

  if (e.target.classList.contains("btn-editar")) {
    const { data, error } = await supabase.from("partidos").select("*").eq("id", id).single();
    if (error) return alert("Error al cargar partido");

    document.getElementById("partidoId").value = data.id;
    equipoLocalSelect.value = data.equipo_local_id;
    equipoVisitanteSelect.value = data.equipo_visitante_id;
    document.getElementById("fecha").value = data.fecha.slice(0, 16);
    document.getElementById("estado").value = data.estado;
    document.getElementById("marcador_local").value = data.marcador_local;
    document.getElementById("marcador_visitante").value = data.marcador_visitante;
    document.getElementById("categoria").value = data.categoria;
    delegadoMesa1Select.value = data.delegado_mesa_1_id;
    delegadoMesa2Select.value = data.delegado_mesa_2_id;
    arbitroPrincipalSelect.value = data.arbitro_principal_id;
    arbitroAsistente1Select.value = data.arbitro_asistente_1_id;
    arbitroAsistente2Select.value = data.arbitro_asistente_2_id;

    formPartido.classList.remove("hidden");
    togglePartido.textContent = "− Ocultar Formulario";
  }

  if (e.target.classList.contains("btn-iniciar")) {
    const { data, error } = await supabase.from("partidos").select("estado").eq("id", id).single();
    if (error) return alert("Error al obtener estado");

    let nuevoEstado = data.estado === "en_vivo" ? "finalizado" : "en_vivo";

    const { error: updateError } = await supabase.from("partidos").update({ estado: nuevoEstado }).eq("id", id);
    if (updateError) return alert("Error al actualizar estado: " + updateError.message);

    cargarPartidos();
  }
});

// Toggle y cancelar
togglePartido.addEventListener("click", () => {
  formPartido.classList.toggle("hidden");
  togglePartido.textContent = formPartido.classList.contains("hidden") ? "+ Agregar Partidos" : "− Ocultar Formulario";
});
cancelarPartido.addEventListener("click", () => {
  formPartido.reset();
  document.getElementById("partidoId").value = "";
  formPartido.classList.add("hidden");
  togglePartido.textContent = "+ Agregar Partidos";
});
// 🎯 Detectar cambio de categoría
const categoriaSelect = document.getElementById("categoria");
categoriaSelect.addEventListener("change", (e) => {
  const categoriaSeleccionada = e.target.value;
  cargarEquipos(categoriaSeleccionada);
});

// 🚀 Inicializar
cargarEquipos();
cargarArbitros();
cargarDelegados();
cargarPartidos();
