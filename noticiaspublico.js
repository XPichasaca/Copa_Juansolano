import { supabase } from "./script.js";

const contenedor = document.getElementById("listaNoticias");

async function cargarNoticiasPublico() {
  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .order("fecha_publicacion", { ascending: false });

  if (error) {
    console.error("Error al cargar noticias:", error);
    contenedor.innerHTML = "<p>No se pudieron cargar las noticias.</p>";
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = "<p>No hay noticias disponibles.</p>";
    return;
  }

  contenedor.innerHTML = data.map(n => {
    const titulo = n.titulo || "Sin título";
    const contenido = n.contenido || n.descripcion || "";
    const fecha = n.fecha_publicacion ? new Date(n.fecha_publicacion).toLocaleDateString() : "";
    const imagen = n.media?.imagen ? `<img src="${n.media.imagen}" alt="Imagen noticia" style="max-width:100%;">` : "";
    const video = n.media?.video ? `<video src="${n.media.video}" controls style="max-width:100%;"></video>` : "";

    return `
      <div class="card-noticia">
        <h3>${titulo}</h3>
        <p>${contenido}</p>
        ${imagen}
        ${video}
        <small>${fecha}</small>
      </div>
    `;
  }).join('');
}

cargarNoticiasPublico();
