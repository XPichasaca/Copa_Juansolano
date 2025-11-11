import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = 3000;

// ==========================
// 🗂️ Configuración de rutas absolutas
// ==========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

app.use(cors());
app.use(express.json());

// ==========================
// 🔗 Conexión a Supabase
// ==========================
const SUPABASE_URL = "https://ghstgwywcaxtfdyyjxli.supabase.co";
const SUPABASE_SERVICE_KEY = "sb_secret_fv9Pisf5Brhe-svtgL9XHg_OXI74kn4"; // Service Role Key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ==========================
// 📌 Crear usuario
// ==========================
app.post("/usuarios", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    console.log("🟢 Datos recibidos:", req.body);

    // 1️⃣ Crear usuario en Auth
    const { data, error: errorAuth } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (errorAuth) throw errorAuth;

    const userId = data.user.id;
    if (!userId) throw new Error("No se obtuvo el ID del usuario creado.");

    // 2️⃣ Insertar en perfiles con rol
    const { error: errorPerfil } = await supabase
      .from("perfiles")
      .insert([{ id: userId, email, role: role.toLowerCase() }]); // rol en minúscula
    if (errorPerfil) throw errorPerfil;

    res.json({ ok: true, user: data.user });
  } catch (err) {
    console.error("❌ Error creando usuario:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// 📌 Listar usuarios
// ==========================
app.get("/usuarios", async (req, res) => {
  try {
    const { data, error } = await supabase.from("perfiles").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ Error listando usuarios:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// 🏠 Ruta principal pública
// ==========================
// Esto asegura que index.html se cargue directamente
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================
// 🖥️ Levantar servidor
// ==========================
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
);
