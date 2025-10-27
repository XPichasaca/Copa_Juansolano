function verificarNomina(equipo, jugadores) {
  const titulares = jugadores.filter(j => j.titular);
  const suplentes = jugadores.filter(j => !j.titular);

  // Cantidad máxima
  if (titulares.length > 11) return { cumple: false, observacion: "Demasiados titulares" };
  if (suplentes.length > 10) return { cumple: false, observacion: "Demasiados suplentes" };

  const hoy = new Date();
  jugadores.forEach(j => j.edad = hoy.getFullYear() - new Date(j.fecha_nacimiento).getFullYear());

  const sub15 = jugadores.find(j => j.edad < 15);
  const sub50 = jugadores.find(j => j.categoria === 'masculino' && j.edad > 50);
  const sub45 = jugadores.find(j => j.categoria === 'femenino' && j.edad > 45);

  let observaciones = [];

  if (equipo.categoria === 'masculino') {
    if (!sub15) observaciones.push("No hay jugador Sub-15");
    if (!sub50) observaciones.push("No hay jugador Sub-50");
  } else {
    if (!sub15) observaciones.push("No hay jugadora Sub-15");
    if (!sub45) observaciones.push("No hay jugadora Sub-45");
  }

  return {
    cumple: true,
    observacion: observaciones.length ? observaciones.join(" y ") : "Nómina completa (ver minutos reglamentarios en partido)"
  };
}
