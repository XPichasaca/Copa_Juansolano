import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔗 Inicializar Supabase
const supabase = createClient(
  "https://djjpoztjzbigudzezjcm.supabase.co",
  "sb_publishable_F0yxa4IfQfkoH74PWHk-7w_SW_fcZMY"
);

// 🔐 Verificar sesión
const { data: session } = await supabase.auth.getSession();
if (!session.session) {
  alert("Debe iniciar sesión para acceder a esta página.");
  window.location.href = "login.html";
}

// 🧠 Referencias DOM
const form = document.getElementById("formEquipo");
const tabla = document.getElementById("tablaEquipos").querySelector("tbody");
const toggleBtn = document.getElementById("toggleFormulario");
const cancelarBtn = document.getElementById("cancelar");
const logoutBtn = document.getElementById("logoutBtn");
const formContainer = document.querySelector(".card-registro");

// 🚪 Cerrar sesión
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

// 📥 Cargar equipos
async function cargarEquipos() {
  const { data, error } = await supabase.from("equipos").select("*").order("id", { ascending: true });
  if (error) {
    console.error("Error al cargar equipos:", error);
    alert("No se pudieron cargar los equipos.");
    return;
  }

  tabla.innerHTML = "";
  data.forEach(eq => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td><img src="${eq.logo_url || 'img/logo.png'}" class="logo-tabla" alt="${eq.nombre}"></td>
      <td>${eq.nombre}</td>
      <td>${eq.fundado || '-'}</td>
      <td>${eq.historia || '-'}</td>
      <td>
        <button class="btn-editar" data-id="${eq.id}">✏️</button>
        <button class="btn-eliminar" data-id="${eq.id}">🗑️</button>
      </td>
    `;
    tabla.appendChild(fila);
  });
}

// ➕ Guardar / Actualizar equipo con subida de imagen
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("equipoId").value;
  const nombre = document.getElementById("nombre").value.trim();
  const fundado = document.getElementById("fundado").value || null;
  const historia = document.getElementById("historia").value.trim();
  const fileInput = document.getElementById("logo");

  let logo_url = null;

  try {
    // 📸 Si se seleccionó una imagen, subirla al bucket
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const fileName = `${Date.now()}_${file.name}`;

      // Subir a Supabase Storage → bucket imagenLogo
      const { error: uploadError } = await supabase.storage
        .from("imagenLogo")
        .upload(fileName, file);

      if (uploadError) {
        throw new Error("Error al subir imagen: " + uploadError.message);
      }

      // Obtener URL pública del archivo
      const { data: publicUrlData } = supabase.storage
        .from("imagenLogo")
        .getPublicUrl(fileName);

      logo_url = publicUrlData.publicUrl;
    } else if (id) {
      // Si no hay nueva imagen, mantener la anterior
      const { data: equipoExistente } = await supabase
        .from("equipos")
        .select("logo_url")
        .eq("id", id)
        .single();
      logo_url = equipoExistente?.logo_url || null;
    }

    // 🧩 Crear objeto para guardar en la BD
    const equipo = { nombre, fundado, historia, logo_url };

    let error;
    if (id) {
      ({ error } = await supabase.from("equipos").update(equipo).eq("id", id));
    } else {
      ({ error } = await supabase.from("equipos").insert([equipo]));
    }

    if (error) throw error;

    alert(id ? "✅ Equipo actualizado correctamente" : "✅ Equipo agregado correctamente");
    form.reset();
    document.getElementById("equipoId").value = "";
    document.getElementById("previewLogo").src = "img/logo.png"; // reset vista previa
    formContainer.classList.add("hidden");
    toggleBtn.textContent = "+ Agregar Nuevo Equipo";
    cargarEquipos();
  } catch (err) {
    console.error("Error al guardar equipo:", err);
    alert("Ocurrió un error: " + err.message);
  }
});


    // 🧾 Crear objeto del equipo
    const equipo = { nombre, fundado, historia, logo_url };

    let error;
    if (id) {
      // Actualizar
      ({ error } = await supabase.from("equipos").update(equipo).eq("id", id));
    } else {
      // Insertar nuevo
      ({ error } = await supabase.from("equipos").insert([equipo]));
    }

    if (error) throw error;

    alert(id ? "✅ Equipo actualizado correctamente" : "✅ Equipo agregado correctamente");
    form.reset();
    document.getElementById("equipoId").value = "";
    formContainer.classList.add("hidden");
    toggleBtn.textContent = "+ Agregar Nuevo Equipo";
    cargarEquipos();
  } catch (err) {
    console.error("Error general:", err.message);
    alert("Ocurrió un error: " + err.message);
  }
});

// 🗑️ Eliminar equipo
tabla.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-eliminar")) {
    const id = e.target.dataset.id;
    if (confirm("¿Eliminar este equipo?")) {
      const { error } = await supabase.from("equipos").delete().eq("id", id);
      if (error) alert("Error: " + error.message);
      else {
        alert("Equipo eliminado");
        cargarEquipos();
      }
    }
  }

  if (e.target.classList.contains("btn-editar")) {
    const id = e.target.dataset.id;
    const { data, error } = await supabase.from("equipos").select("*").eq("id", id).single();
    if (error) {
      alert("Error al cargar: " + error.message);
      return;
    }

    document.getElementById("equipoId").value = data.id;
    document.getElementById("nombre").value = data.nombre;
    document.getElementById("logo_url").value = data.logo_url || "";
    document.getElementById("fundado").value = data.fundado || "";
    document.getElementById("historia").value = data.historia || "";

    formContainer.classList.remove("hidden");
    toggleBtn.textContent = "− Ocultar Formulario";
  }
});

// 🔄 Mostrar / Ocultar formulario
toggleBtn.addEventListener("click", () => {
  formContainer.classList.toggle("hidden");
  toggleBtn.textContent = formContainer.classList.contains("hidden")
    ? "+ Agregar Nuevo Equipo"
    : "− Ocultar Formulario";
});

// ❌ Cancelar edición
cancelarBtn.addEventListener("click", () => {
  form.reset();
  document.getElementById("equipoId").value = "";
  formContainer.classList.add("hidden");
  toggleBtn.textContent = "+ Agregar Nuevo Equipo";
});

// 🚀 Iniciar
cargarEquipos();



// 👉 Adaptado de tu estructura para gestionar PARTIDOS

const formPartido = document.getElementById("formPartido");
const formPartidoContainer = formPartido.parentElement;
const toggleFormularioPartido = document.getElementById("toggleFormularioPartido");
const cancelarPartido = document.getElementById("cancelarPartido");
const tablaPartidos = document.getElementById("tablaPartidos").querySelector("tbody");

// 📥 Cargar partidos
async function cargarPartidos() {
  const { data, error } = await supabase
    .from("partidos")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error al cargar partidos:", error);
    alert("No se pudieron cargar los partidos.");
    return;
  }

  tablaPartidos.innerHTML = "";
  data.forEach(p => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.equipo_local}</td>
      <td>${p.equipo_visitante}</td>
      <td>${p.fecha_partido || '-'}</td>
      <td>${p.hora_partido || '-'}</td>
      <td>${p.estado_partido || '-'}</td>
      <td>
        <button class="btn-editar" data-id="${p.id}">✏️</button>
        <button class="btn-eliminar" data-id="${p.id}">🗑️</button>
      </td>
    `;
    tablaPartidos.appendChild(fila);
  });
}

// ➕ Guardar / Actualizar partido
formPartido.addEventListener("submit", async (e) => {
  e.preventDefault();

  const partido = {
    equipo_local: document.getElementById("equipo_local").value.trim(),
    equipo_visitante: document.getElementById("equipo_visitante").value.trim(),
    fecha_partido: document.getElementById("fecha_partido").value,
    hora_partido: document.getElementById("hora_partido").value,
    estado_partido: document.getElementById("estado_partido").value,
  };

  const id = document.getElementById("partidoId").value;

  let error;
  if (id) {
    ({ error } = await supabase.from("partidos").update(partido).eq("id", id));
  } else {
    ({ error } = await supabase.from("partidos").insert([partido]));
  }

  if (error) {
    alert("Error al guardar partido: " + error.message);
  } else {
    alert(id ? "Partido actualizado" : "Partido agregado");
    formPartido.reset();
    document.getElementById("partidoId").value = "";
    formPartidoContainer.classList.add("hidden");
    toggleFormularioPartido.textContent = "+ Agregar Nuevo Partido";
    cargarPartidos();
  }
});

// 🗑️ Eliminar partido
tablaPartidos.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-eliminar")) {
    const id = e.target.dataset.id;
    if (confirm("¿Eliminar este partido?")) {
      const { error } = await supabase.from("partidos").delete().eq("id", id);
      if (error) alert("Error: " + error.message);
      else {
        alert("Partido eliminado");
        cargarPartidos();
      }
    }
  }

  if (e.target.classList.contains("btn-editar")) {
    const id = e.target.dataset.id;
    const { data, error } = await supabase.from("partidos").select("*").eq("id", id).single();
    if (error) {
      alert("Error al cargar partido: " + error.message);
      return;
    }

    document.getElementById("partidoId").value = data.id;
    document.getElementById("equipo_local").value = data.equipo_local || "";
    document.getElementById("equipo_visitante").value = data.equipo_visitante || "";
    document.getElementById("fecha_partido").value = data.fecha_partido || "";
    document.getElementById("hora_partido").value = data.hora_partido || "";
    document.getElementById("estado_partido").value = data.estado_partido || "";

    formPartidoContainer.classList.remove("hidden");
    toggleFormularioPartido.textContent = "− Ocultar Formulario";
  }
});

// 🔄 Mostrar / Ocultar formulario
toggleFormularioPartido.addEventListener("click", () => {
  formPartidoContainer.classList.toggle("hidden");
  toggleFormularioPartido.textContent = formPartidoContainer.classList.contains("hidden")
    ? "+ Agregar Nuevo Partido"
    : "− Ocultar Formulario";
});

// ❌ Cancelar edición
cancelarPartido.addEventListener("click", () => {
  formPartido.reset();
  document.getElementById("partidoId").value = "";
  formPartidoContainer.classList.add("hidden");
  toggleFormularioPartido.textContent = "+ Agregar Nuevo Partido";
});

// 🚀 Iniciar
cargarPartidos();
