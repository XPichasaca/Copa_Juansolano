import { supabase } from "./supabasePublico.js";

// --------------------
// COMPARTIR SECCIÓN
// --------------------
export function compartirSeccion(red, hash) {
  const base = window.location.href.split('#')[0]; // URL sin ancla
  const url = encodeURIComponent(base + hash);
  let link = "";

  switch (red) {
    case "facebook":
      link = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;
    case "twitter":
      link = `https://twitter.com/intent/tweet?url=${url}`;
      break;
    case "whatsapp":
      link = `https://api.whatsapp.com/send?text=${url}`;
      break;
  }

  window.open(link, "_blank", "width=600,height=500");
}

// --------------------
// CARGAR POSICIONES
// --------------------
export async function cargarPosiciones() {
  const contMas = document.querySelector("#tablaMasculino tbody");
  const contFem = document.querySelector("#tablaFemenino tbody");
  if (!contMas || !contFem) return;

  const { data: posiciones, error } = await supabase
    .from("tabla_posiciones")
    .select("*")
    .order("categoria", { ascending: true })
    .order("puntos", { ascending: false });

  if (error) { console.error(error); return; }

  let htmlMas = "";
  let htmlFem = "";

  posiciones.forEach(p => {
    const fila = `
      <tr>
        <td>${p.posicion}</td>
        <td>${p.equipo}</td>
        <td>${p.puntos}</td>
        <td>${p.pj}</td>
        <td>${p.dg}</td>
      </tr>
    `;
    if (p.categoria === "MASCULINO") htmlMas += fila;
    if (p.categoria === "FEMENINO") htmlFem += fila;
  });

  contMas.innerHTML = htmlMas;
  contFem.innerHTML = htmlFem;
}

// --------------------
// CARGAR NOTICIAS
// --------------------
export async function cargarNoticias() {
  const cont = document.querySelector("#listaNoticias");
  if (!cont) return;

  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .order("fecha_publicacion", { ascending: false });

  if (error) { console.error(error); return; }

  cont.innerHTML = data.map(n => `
    <div class="card-noticia">
      <h3>${n.titulo}</h3>
      <p>${n.contenido || n.descripcion || ""}</p>
    </div>
  `).join("");
}

// --------------------
// CARGAR PARTIDOS
// --------------------
export async function cargarPartidos() {
  const cont = document.querySelector("#listaPartidos");
  if (!cont) return;

  const { data, error } = await supabase
    .from("partidos")
    .select("*")
    .order("fecha", { ascending: true });

  if (error) { console.error(error); return; }

  cont.innerHTML = data.map(p => `
    <div class="partido-card">
      <strong>${p.equipo_local} ${p.marcador_local} - ${p.marcador_visitante} ${p.equipo_visitante}</strong>
      <div>${new Date(p.fecha).toLocaleString()}</div>
    </div>
  `).join("");
}

// --------------------
// INICIALIZAR TODO AUTOMÁTICO
// --------------------
document.addEventListener("DOMContentLoaded", () => {
  cargarPosiciones();
  cargarNoticias();
  cargarPartidos();

  // Para botones globales
  window.compartirSeccion = compartirSeccion;
});
