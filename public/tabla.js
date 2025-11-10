import { supabase } from "./script.js"; // conexión Supabase

const tablaMasculino = document.getElementById("tablaPosicionesMasculino").querySelector("tbody");
const tablaFemenino = document.getElementById("tablaPosicionesFemenino").querySelector("tbody");

async function cargarPosiciones() {
  try {
    const { data, error } = await supabase
      .from("posiciones")
      .select(`
        id,
        equipo:equipo_id (
          id,
          nombre,
          logo_url
        ),
        genero,
        PJ,
        PG,
        PE,
        PP,
        GF,
        GC,
        DG,
        PTS
      `)
      .order("PTS", { ascending: false });

    if (error) throw error;

    tablaMasculino.innerHTML = "";
    tablaFemenino.innerHTML = "";

    let contMas = 1;
    let contFem = 1;

    for (const p of data) {
      let logo = p.equipo.logo_url || 'img/logo.png';

      // Si el logo está en Storage, obtener URL pública
      if (logo.startsWith("public/") || logo.startsWith("imagenLogo/")) {
        const { data: publicUrlData } = supabase.storage
          .from("imagenLogo")
          .getPublicUrl(logo);
        logo = publicUrlData.publicUrl;
      }

      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${p.genero === 'masculino' ? contMas : contFem}</td>
        <td>
          <img src="${logo}" alt="${p.equipo.nombre}" class="logo-tabla">
          <span>${p.equipo.nombre}</span>
        </td>
        <td>${p.PJ}</td>
        <td>${p.PG}</td>
        <td>${p.PE}</td>
        <td>${p.PP}</td>
        <td>${p.GF}</td>
        <td>${p.GC}</td>
        <td>${p.DG}</td>
        <td>${p.PTS}</td>
      `;

      if (p.genero === 'masculino') {
        tablaMasculino.appendChild(fila);
        contMas++;
      } else {
        tablaFemenino.appendChild(fila);
        contFem++;
      }
    }

  } catch (err) {
    console.error("Error cargando posiciones:", err);
  }
}

cargarPosiciones();
