// ==========================
// 🔗 Conexión a Supabase (sin login)
// ==========================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://ghstgwywcaxtfdyyjxli.supabase.co";
const SUPABASE_KEY = "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ"; // Public Anon Key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================
// Referencias HTML
// ==========================
const contenedorGoleadores = document.querySelector("#contenedorGoleadores");
const contenedorTarjetas = document.querySelector("#contenedorTarjetas");

// ==========================
// 🔹 CARGAR ESTADÍSTICAS
// ==========================
async function cargarEstadisticas() {
  try {
    const { data, error } = await supabase
      .from("estadisticas")
      .select(`
        id,
        tipo_evento,
        minuto,
        jugador:jugador_id (
          id,
          nombre,
          categoria,
          equipo:equipo_id (
            id,
            nombre,
            logo_url
          )
        ),
        partido:partido_id (
          id,
          equipo_local:equipo_local_id (nombre),
          equipo_visitante:equipo_visitante_id (nombre)
        )
      `);

    if (error) throw error;

    const mapaGoles = new Map();
    const mapaTarjetas = new Map();

    data.forEach(e => {
      if (!e.jugador) return;
      const j = e.jugador;
      const equipo = j.equipo || {};
      const partido = e.partido
        ? `${e.partido.equipo_local?.nombre || "?"} vs ${e.partido.equipo_visitante?.nombre || "?"}`
        : "Sin partido";

      const clave = j.id;

      // ⚽ Goles
      if (e.tipo_evento === "gol") {
        if (!mapaGoles.has(clave)) {
          mapaGoles.set(clave, {
            jugador: j.nombre,
            categoria: j.categoria || "Sin categoría",
            equipo: equipo.nombre,
            logo: equipo.logo_url || "img/logo.png",
            goles: [],
          });
        }
        mapaGoles.get(clave).goles.push({ minuto: e.minuto, partido });
      }

      // 🟨 Tarjetas
      if (["amarilla", "roja_directa", "roja_doble_amarilla"].includes(e.tipo_evento)) {
        if (!mapaTarjetas.has(clave)) {
          mapaTarjetas.set(clave, {
            jugador: j.nombre,
            categoria: j.categoria || "Sin categoría",
            equipo: equipo.nombre,
            logo: equipo.logo_url || "img/logo.png",
            tarjetas: [],
          });
        }
        mapaTarjetas.get(clave).tarjetas.push({ tipo: e.tipo_evento, minuto: e.minuto, partido });
      }
    });

    // Clasificar por categoría
    const golesMasculino = [...mapaGoles.values()].filter(g => g.categoria?.toLowerCase().includes("masculino"));
    const golesFemenino = [...mapaGoles.values()].filter(g => g.categoria?.toLowerCase().includes("femenino"));

    const tarjetasMasculino = [...mapaTarjetas.values()].filter(g => g.categoria?.toLowerCase().includes("masculino"));
    const tarjetasFemenino = [...mapaTarjetas.values()].filter(g => g.categoria?.toLowerCase().includes("femenino"));

    renderGoleadores(golesMasculino, golesFemenino);
    renderTarjetas(tarjetasMasculino, tarjetasFemenino);

  } catch (err) {
    console.error("❌ Error al cargar estadísticas:", err);
  }
}

// ==========================
// ⚽ RENDER GOLEADORES
// ==========================
function renderGoleadores(masculino, femenino) {
  contenedorGoleadores.innerHTML = `
    <div class="columna">
      <h3>⚽ Masculino</h3>
      <table class="tabla">
        <thead><tr><th>Jugador</th><th>Equipo</th><th>Goles</th></tr></thead>
        <tbody>${crearFilasGoles(masculino)}</tbody>
      </table>
    </div>
    <div class="columna">
      <h3>⚽ Femenino</h3>
      <table class="tabla">
        <thead><tr><th>Jugador</th><th>Equipo</th><th>Goles</th></tr></thead>
        <tbody>${crearFilasGoles(femenino)}</tbody>
      </table>
    </div>
  `;
}

function crearFilasGoles(lista) {
  return lista
    .sort((a, b) => b.goles.length - a.goles.length)
    .map((g, i) => `
      <tr>
        <td><div class="jugador-info"><img src="${g.logo}" class="logo-equipo"> ${g.jugador}</div></td>
        <td>${g.equipo}</td>
        <td>
          ${g.goles.length}
          <input type="checkbox" id="goles-${i}" class="chk-historial">
          <div class="historial hidden">
            ${g.goles.map(e => `⚽ ${e.minuto}' — <i>${e.partido}</i>`).join("<br>")}
          </div>
        </td>
      </tr>
    `).join("");
}

// ==========================
// 🟥 RENDER TARJETAS
// ==========================
function renderTarjetas(masculino, femenino) {
  contenedorTarjetas.innerHTML = `
    <div class="columna">
      <h3>🟨 Masculino</h3>
      <table class="tabla">
        <thead><tr><th>Jugador</th><th>Equipo</th><th>Detalles</th><th>Total</th></tr></thead>
        <tbody>${crearFilasTarjetas(masculino)}</tbody>
      </table>
    </div>
    <div class="columna">
      <h3>🟨 Femenino</h3>
      <table class="tabla">
        <thead><tr><th>Jugador</th><th>Equipo</th><th>Detalles</th><th>Total</th></tr></thead>
        <tbody>${crearFilasTarjetas(femenino)}</tbody>
      </div>
    </div>
  `;
}

function crearFilasTarjetas(lista) {
  return lista
    .sort((a, b) => b.tarjetas.length - a.tarjetas.length)
    .map((t, i) => {
      const detalles = t.tarjetas.map(e => {
        if (e.tipo === "amarilla") return "🟨";
        if (e.tipo === "roja_directa") return "🟥";
        return "🟨🟨🟥";
      }).join(" ");

      const historial = t.tarjetas
        .map(e => {
          const icon = e.tipo === "amarilla" ? "🟨" : e.tipo === "roja_directa" ? "🟥" : "🟨🟨🟥";
          return `${icon} ${e.minuto}' — <i>${e.partido}</i>`;
        })
        .join("<br>");

      return `
        <tr>
          <td><div class="jugador-info"><img src="${t.logo}" class="logo-equipo"> ${t.jugador}</div></td>
          <td>${t.equipo}</td>
          <td>${detalles}</td>
          <td>
            ${t.tarjetas.length}
            <input type="checkbox" id="tarjetas-${i}" class="chk-historial">
            <div class="historial hidden">${historial}</div>
          </td>
        </tr>
      `;
    }).join("");
}

// ==========================
// 🎯 EVENTOS DE CHECKBOX
// ==========================
document.addEventListener("change", e => {
  if (e.target.classList.contains("chk-historial")) {
    const detalle = e.target.nextElementSibling;
    detalle.classList.toggle("hidden", !e.target.checked);
  }
});

// ==========================
// 🚀 INICIO
// ==========================
cargarEstadisticas();
