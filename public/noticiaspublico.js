import { supabase } from "./supabasePublico.js";

const contenedor = document.getElementById("listaNoticias");

// Función para compartir en redes
function compartir(red, titulo, contenido, url) {
  const mensaje = encodeURIComponent(`${titulo}\n\n${contenido}`);
  const enlace = encodeURIComponent(url);
  let link = "";

  switch (red) {
    case "facebook":
      link = `https://www.facebook.com/sharer/sharer.php?u=${enlace}`;
      break;
    case "twitter":
      link = `https://twitter.com/intent/tweet?text=${mensaje}&url=${enlace}`;
      break;
    case "whatsapp":
      link = `https://api.whatsapp.com/send?text=${mensaje}%20${enlace}`;
      break;
  }

  window.open(link, "_blank", "width=600,height=500");
}

// --------------------
// ESTILOS RESPONSIVE
// --------------------
const style = document.createElement("style");
style.textContent = `
  #listaNoticias {
    display: block; /* Por defecto Masonry manejará columnas */
  }

  .card-noticia {
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    padding: 12px;
    margin-bottom: 20px; /* Para separación vertical en móvil */
  }

  .card-noticia .contenido p {
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    #listaNoticias {
      display: grid !important;
      grid-template-columns: 1fr !important; /* 1 columna móvil */
      gap: 15px !important;
    }
  }
`;
document.head.appendChild(style);

// --------------------
// Cargar noticias desde Supabase
// --------------------
export async function cargarNoticiasPublico() {
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

  contenedor.innerHTML = data
    .map(n => {
      const titulo = n.titulo || "Sin título";
      const contenido = n.contenido || n.descripcion || "";
      const fecha = n.fecha_publicacion
        ? new Date(n.fecha_publicacion).toLocaleDateString()
        : "";

      // Media
      let mediaUrl = "", videoUrl = "";
      if (n.media) {
        const mediaData = typeof n.media === "string" ? JSON.parse(n.media) : n.media;
        mediaUrl = mediaData?.imagen || "";
        videoUrl = mediaData?.video || "";
      }

      const mediaHTML =
        mediaUrl || videoUrl
          ? `<div class="media">
              ${mediaUrl ? `<img src="${mediaUrl}" alt="Imagen noticia">` : `<video src="${videoUrl}" controls></video>`}
            </div>`
          : "";

      return `
        <div class="card-noticia">
          <h3>${titulo}</h3>
          ${mediaHTML}
          <div class="contenido">
            <p>${contenido}</p>
            <button class="btn-ver-mas">Ver más</button>
          </div>
          <div class="acciones">
            <div class="redes">
              <button class="facebook" onclick="compartir('facebook','${titulo}','${contenido}',window.location.href)">
                <i class="fab fa-facebook-f"></i>
              </button>
              <button class="twitter" onclick="compartir('twitter','${titulo}','${contenido}',window.location.href)">
                <i class="fab fa-twitter"></i>
              </button>
              <button class="whatsapp" onclick="compartir('whatsapp','${titulo}','${contenido}',window.location.href)">
                <i class="fab fa-whatsapp"></i>
              </button>
            </div>
            <small class="fecha">${fecha}</small>
          </div>
        </div>
      `;
    })
    .join("");

  // Activar botones "Ver más"
  document.querySelectorAll(".btn-ver-mas").forEach(btn => {
    btn.addEventListener("click", () => {
      const parrafo = btn.closest(".card-noticia").querySelector("p");
      if (parrafo.style.display === "block") {
        parrafo.style.display = "-webkit-box";
        btn.textContent = "Ver más";
      } else {
        parrafo.style.display = "block";
        btn.textContent = "Ver menos";
      }
    });
  });

  // Inicializar Masonry o grid según pantalla
  initMasonry();
}

// --------------------
// Masonry / Responsive
// --------------------
function initMasonry() {
  if (window.innerWidth > 768) {
    if (typeof Masonry !== "undefined") {
      new Masonry(contenedor, {
        itemSelector: ".card-noticia",
        columnWidth: ".card-noticia",
        percentPosition: true,
        gutter: 20
      });
    }
  } else {
    // Móvil: deshabilitamos Masonry y usamos 1 columna
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "1fr";
    contenedor.style.gap = "15px";
  }
}

// Volver a aplicar Masonry si cambia el tamaño de ventana
window.addEventListener("resize", () => initMasonry());

// Para acceso global desde HTML
window.compartir = compartir;

// Llamar a la función para cargar noticias
cargarNoticiasPublico();
