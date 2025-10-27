import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'; // Asegúrate de importar correctamente
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = 3000;

// Conexión a Supabase - Asegúrate de que esta parte esté después de las importaciones
const supabase = createClient(
  "https://djjpoztjzbigudzezjcm.supabase.co",  // URL de tu proyecto Supabase
  "sb_secret_dEby5FLVtfBKnFBxcexKwg_mXHNL9W4"  // Tu clave de API
);

// Test de conexión
(async () => {
  const { data, error } = await supabase.from("jugadores").select("*").limit(1);
  if (error) console.error("❌ Error al conectar con Supabase:", error.message);
  else console.log("✅ Conexión exitosa a Supabase. Ejemplo de datos:", data);
})();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// =======================
// 📦 RUTAS API
// =======================

// 📰 Noticias
app.get("/api/noticias", async (req, res) => {
  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ⚽ Equipos
app.get("/api/equipos", async (req, res) => {
  const { data, error } = await supabase
    .from("equipos")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 🏆 Tabla de posiciones
app.get("/api/tabla", async (req, res) => {
  const { data, error } = await supabase
    .from("tabla_posiciones")
    .select("*")
    .order("puntos", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 🥅 Partidos
app.get("/api/partidos", async (req, res) => {
  const { data, error } = await supabase
    .from("partidos")
    .select("*")
    .order("fecha", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 👤 Jugadores
app.get("/api/jugadores", async (req, res) => {
  const { data, error } = await supabase
    .from("jugadores")
    .select("*")
    .order("equipo", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =======================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
