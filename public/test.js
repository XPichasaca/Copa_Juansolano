import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://ghstgwywcaxtfdyyjxli.supabase.co",  // ⚠️ reemplaza con tu nuevo
  "sb_publishable_bm3rEZ92WLzBkxqpvWCu0w_oG4Cr9YZ"
);

const { data, error } = await supabase.from("equipos").select("*");
console.log("✅ Datos reales:", data, "❌ Error:", error);
