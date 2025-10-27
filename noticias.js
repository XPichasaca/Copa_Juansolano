import { supabase } from "./script.js";

const form = document.getElementById("formNoticia");
const tabla = document.querySelector("#tablaNoticias tbody");
const toggleBtn = document.getElementById("toggleNoticia");
const cancelarBtn = document.getElementById("cancelarNoticia");
const inputImagen = document.getElementById("imagenNoticia");
const previewImagen = document.getElementById("previewImagen");

// ============================
// 🔹 CARGAR NOTICIAS
// ============================
async function cargarNoticias() {
  const { data, error } = await supabase
    .from("noticias")
    .select("id, titulo, contenido, fecha_publicacion, media")
    .order("fecha_publicacion", { ascending: false });

  if (error) return console.error("Error al cargar noticias:", error);

  tabla.innerHTML = "";
  data.forEach(n => {
    const fila = document.createElement("tr");

    // Crear columna de media
    const tdMedia = document.createElement("td");
    if (n.media?.imagen) {
      const img = document.createElement("img");
      img.src = n.media.imagen;
      img.alt = "Imagen";
      img.style.maxWidth = "100px";
      tdMedia.appendChild(img);
    }
    if (n.media?.video) {
      const video = document.createElement("video");
      video.src = n.media.video;
      video.controls = true;
      video.style.maxWidth = "150px";
      tdMedia.appendChild(video);
    }

    fila.innerHTML = `
      <td>${n.titulo}</td>
      <td>${n.contenido}</td>
      <td></td>
      <td>${new Date(n.fecha_publicacion).toLocaleDateString()}</td>
      <td>
        <button class="btn-editar" data-id="${n.id}">✏️</button>
        <button class="btn-eliminar" data-id="${n.id}">🗑️</button>
      </td>
    `;
    fila.children[2].appendChild(tdMedia);
    tabla.appendChild(fila);
  });
}

// ============================
// 🔹 GUARDAR O ACTUALIZAR NOTICIA
// ============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("noticiaId").value;
  const titulo = document.getElementById("tituloNoticia").value.trim();
  const contenido = document.getElementById("descripcionNoticia").value.trim();
  const fecha = document.getElementById("fechaNoticia").value || new Date().toISOString();
  const video = document.getElementById("videoNoticia").value.trim();

  let imagenUrl = null;

  // Subir imagen a Storage si hay archivo seleccionado
  if (inputImagen.files.length > 0) {
    const file = inputImagen.files[0];
    const fileName = `${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("imagenNoticia")
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      alert("Error al subir imagen: " + uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("imagenNoticia")
      .getPublicUrl(fileName);

    imagenUrl = publicUrlData.publicUrl;
  }

  const noticia = { titulo, contenido, fecha_publicacion: fecha, media: {} };
  if (imagenUrl) noticia.media.imagen = imagenUrl;
  if (video) noticia.media.video = video;

  let error;
  if (id) {
    ({ error } = await supabase.from("noticias").update(noticia).eq("id", id));
  } else {
    ({ error } = await supabase.from("noticias").insert([noticia]));
  }

  if (error) alert("Error: " + error.message);
  else alert(id ? "Noticia actualizada" : "Noticia agregada");

  form.reset();
  document.getElementById("noticiaId").value = "";
  inputImagen.value = "";
  previewImagen.src = "";
  previewImagen.style.display = "none";
  form.classList.add("hidden");
  toggleBtn.textContent = "+ Agregar Noticia";

  cargarNoticias();
});

// ============================
// 🔹 VISTA PREVIA DE IMAGEN
// ============================
inputImagen.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImagen.src = ev.target.result;
      previewImagen.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    previewImagen.src = "";
    previewImagen.style.display = "none";
  }
});

// ============================
// 🔹 EDITAR O ELIMINAR NOTICIA
// ============================
tabla.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;

  if (e.target.classList.contains("btn-eliminar")) {
    if (confirm("¿Eliminar noticia?")) {
      const { error } = await supabase.from("noticias").delete().eq("id", id);
      if (error) alert("Error al eliminar: " + error.message);
      else cargarNoticias();
    }
  }

  if (e.target.classList.contains("btn-editar")) {
    const { data, error } = await supabase.from("noticias").select("*").eq("id", id).single();
    if (error) return alert("Error al cargar noticia");

    document.getElementById("noticiaId").value = data.id;
    document.getElementById("tituloNoticia").value = data.titulo;
    document.getElementById("descripcionNoticia").value = data.contenido;
    document.getElementById("fechaNoticia").value = data.fecha_publicacion.split("T")[0];
    document.getElementById("videoNoticia").value = data.media?.video || "";

    // Vista previa de la imagen existente
    if (data.media?.imagen) {
      previewImagen.src = data.media.imagen;
      previewImagen.style.display = "block";
    } else {
      previewImagen.src = "";
      previewImagen.style.display = "none";
    }

    form.classList.remove("hidden");
    toggleBtn.textContent = "− Ocultar Formulario";
  }
});

// ============================
// 🔹 TOGGLE FORMULARIO
// ============================
toggleBtn.addEventListener("click", () => {
  form.classList.toggle("hidden");
  toggleBtn.textContent = form.classList.contains("hidden")
    ? "+ Agregar Noticia"
    : "− Ocultar Formulario";
});

// ============================
// 🔹 CANCELAR FORMULARIO
// ============================
cancelarBtn.addEventListener("click", () => {
  form.reset();
  document.getElementById("noticiaId").value = "";
  inputImagen.value = "";
  previewImagen.src = "";
  previewImagen.style.display = "none";
  form.classList.add("hidden");
  toggleBtn.textContent = "+ Agregar Noticia";
});

// ============================
// 🔹 INICIO
// ============================
cargarNoticias();
