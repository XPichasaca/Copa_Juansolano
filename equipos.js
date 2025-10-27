import { supabase } from "./script.js"; // conexión Supabase

// Referencias del formulario y tabla
const form = document.getElementById("formEquipo");
const tablaEquipos = document.getElementById("tablaEquipos").querySelector("tbody");
const cancelarBtn = document.getElementById("cancelar");
const formContainer = document.querySelector(".card-registro");
const previewLogo = document.getElementById("previewLogo");
const inputLogo = document.getElementById("logo");

// ============================
// 🔹 CARGAR EQUIPOS EN TABLA
// ============================
const cargarEquipos = async () => {
  const { data, error } = await supabase.from("equipos").select("*").order("id", { ascending: true });

  if (error) {
    console.error("Error al cargar equipos:", error);
    return;
  }

  tablaEquipos.innerHTML = "";
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
    tablaEquipos.appendChild(fila);
  });
};

// ============================
// 🔹 GUARDAR O EDITAR EQUIPO
// ============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("equipoId").value;
  const nombre = document.getElementById("nombre").value.trim();
  const fundado = document.getElementById("fundado").value || null;
  const historia = document.getElementById("historia").value.trim();

  let logo_url = null;

  try {
    // Si se seleccionó una imagen nueva, subirla al bucket
    if (inputLogo.files.length > 0) {
      const file = inputLogo.files[0];
      const fileName = `${Date.now()}_${file.name}`;

      // 📤 Subir imagen al bucket "imagenLogo"
      const { error: uploadError } = await supabase.storage
        .from("imagenLogo")
        .upload(fileName, file);

      if (uploadError) throw new Error("Error al subir imagen: " + uploadError.message);

      // 📎 Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from("imagenLogo")
        .getPublicUrl(fileName);

      logo_url = publicUrlData.publicUrl;
    } else if (id) {
      // Si estamos editando y no se cambió imagen → mantener la anterior
      const { data: existente } = await supabase
        .from("equipos")
        .select("logo_url")
        .eq("id", id)
        .single();
      logo_url = existente?.logo_url || null;
    }

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
    previewLogo.src = "img/logo.png";
    formContainer.classList.add("hidden");
    cargarEquipos();
  } catch (err) {
    console.error("Error al guardar equipo:", err);
    alert("❌ " + err.message);
  }
});

// ============================
// 🔹 EDITAR O ELIMINAR EQUIPO
// ============================
tablaEquipos.addEventListener("click", async (e) => {
  // 🗑️ Eliminar
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

  // ✏️ Editar
  if (e.target.classList.contains("btn-editar")) {
    const id = e.target.dataset.id;
    const { data, error } = await supabase.from("equipos").select("*").eq("id", id).single();
    if (error) {
      alert("Error al cargar: " + error.message);
      return;
    }

    document.getElementById("equipoId").value = data.id;
    document.getElementById("nombre").value = data.nombre;
    document.getElementById("fundado").value = data.fundado || "";
    document.getElementById("historia").value = data.historia || "";

    // Mostrar logo actual en vista previa
    previewLogo.src = data.logo_url || "img/logo.png";
    inputLogo.value = "";

    formContainer.classList.remove("hidden");
  }
});

// ============================
// 🔹 VISTA PREVIA DE LOGO NUEVO
// ============================
inputLogo.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewLogo.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// ============================
// 🔹 CANCELAR FORMULARIO
// ============================
cancelarBtn.addEventListener("click", () => {
  form.reset();
  document.getElementById("equipoId").value = "";
  previewLogo.src = "img/logo.png";
  formContainer.classList.add("hidden");
});

// ============================
// 🔹 INICIO
// ============================
cargarEquipos();
