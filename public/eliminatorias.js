// -----------------------------
// FUNCIONES DE ELIMINATORIAS
// -----------------------------

// Obtener equipos clasificados de la fase de grupos (debes adaptar esta función a tu lógica)
function obtenerClasificados(categoria) {
  // Ejemplo: retornar los 4 mejores equipos según tu tabla calculada
  // [{id:1, nombre:"Equipo A"}, {id:2, nombre:"Equipo B"}, ...]
  return tablaPosicionesCalculada
    .filter(e => e.categoria === categoria)
    .sort((a,b) => b.puntos - a.puntos) // orden descendente por puntos
    .slice(0,4); // tomar top 4
}

// Crear semifinales
async function crearSemifinales(categoria, clasificados) {
  if(clasificados.length !== 4) return showMsg(`Necesitas 4 equipos para crear semifinales de ${categoria}`);

  const partidos = [
    {
      categoria,
      fase: "semifinal",
      equipo_local_id: clasificados[0].id,
      equipo_visitante_id: clasificados[3].id,
      estado: "pendiente"
    },
    {
      categoria,
      fase: "semifinal",
      equipo_local_id: clasificados[1].id,
      equipo_visitante_id: clasificados[2].id,
      estado: "pendiente"
    }
  ];

  const { error } = await supabase.from("partidos").insert(partidos);
  if(error) console.error(error);
  else showMsg(`✅ Semifinales de ${categoria} creadas`);
}

// Obtener ganador y perdedor de un partido
function ganador(partido) {
  return partido.marcador_local > partido.marcador_visitante
    ? partido.equipo_local_id
    : partido.equipo_visitante_id;
}

function perdedor(partido) {
  return partido.marcador_local > partido.marcador_visitante
    ? partido.equipo_visitante_id
    : partido.equipo_local_id;
}

// Crear final y tercer puesto
async function crearFinales(categoria) {
  const { data: semis } = await supabase
    .from("partidos")
    .select("*")
    .eq("categoria", categoria)
    .eq("fase", "semifinal")
    .eq("estado", "finalizado");

  if(semis.length !== 2) return; // Aún no se han jugado ambas semifinales

  const ganador1 = ganador(semis[0]);
  const ganador2 = ganador(semis[1]);
  const perdedor1 = perdedor(semis[0]);
  const perdedor2 = perdedor(semis[1]);

  const partidos = [
    {
      categoria,
      fase: "final",
      equipo_local_id: ganador1,
      equipo_visitante_id: ganador2,
      estado: "pendiente"
    },
    {
      categoria,
      fase: "tercer_puesto",
      equipo_local_id: perdedor1,
      equipo_visitante_id: perdedor2,
      estado: "pendiente"
    }
  ];

  const { error } = await supabase.from("partidos").insert(partidos);
  if(error) console.error(error);
  else showMsg(`✅ Final y tercer puesto de ${categoria} creados`);
}

// -----------------------------
// BOTÓN PARA CREAR SEMIFINALES
// -----------------------------
document.getElementById("btnCrearSemifinales")?.addEventListener("click", async () => {
  const clasificadosMasculino = obtenerClasificados("masculino");
  const clasificadosFemenino = obtenerClasificados("femenino");

  if(clasificadosMasculino.length === 4) await crearSemifinales("masculino", clasificadosMasculino);
  else showMsg("❌ Faltan 4 equipos masculinos para semifinales");

  if(clasificadosFemenino.length === 4) await crearSemifinales("femenino", clasificadosFemenino);
  else showMsg("❌ Faltan 4 equipos femeninos para semifinales");
});

// -----------------------------
// SUSCRIPCIÓN TIEMPO REAL PARA SEMIFINALES
// -----------------------------
// Cada vez que se finaliza un partido de semifinal, revisar si se pueden crear final y tercer puesto
supabase
  .channel('realtime-partidos')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidos' }, payload => {
    const p = payload.new;
    if(p.fase === "semifinal" && p.estado === "finalizado") {
      crearFinales(p.categoria);
    }
  })
  .subscribe();
