// G:\renovation-system\frontend\src\utils\supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Upewnij się, że zmienne są dostępne przed inicjalizacją klienta
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key is missing in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
