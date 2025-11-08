// G:\renovation-system\backend\src\config\supabase.js
require("dotenv").config(); // Ładuje zmienne środowiskowe z .env

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Podstawowa walidacja, czy zmienne są dostępne
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "BŁĄD: Zmienne środowiskowe SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY nie są ustawione dla backendu."
  );
  // Możesz tutaj podjąć decyzje, np. zakończyć proces, rzucić błąd
  throw new Error("Konfiguracja Supabase backendu niekompletna.");
}

// Inicjalizuj klienta Supabase z kluczem Service Role Key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = supabase; // Eksportujemy instancję klienta Supabase
