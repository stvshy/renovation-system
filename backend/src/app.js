// G:\renovation-system\backend\src\app.js
require("dotenv").config(); // Musi być na samej górze, aby .env było dostępne

const express = require("express");
const cors = require("cors");
const supabase = require("./config/supabase"); // Importujemy skonfigurowanego klienta Supabase

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Włącza CORS dla wszystkich żądań
app.use(express.json()); // Umożliwia parsowanie ciała żądań w formacie JSON

// Podstawowa trasa testowa
app.get("/", (req, res) => {
  res.send("API działa! Witaj w Ekipy Budowlano-Remontowe API!");
});

// Przykładowy endpoint do pobierania zadań z Supabase (przez backend)
// To jest trasa, którą frontend może wywołać, aby otrzymać dane z Supabase
app.get("/api/clients", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("clients") // Zmieniamy nazwę tabeli na 'clients'
      .select("*");

    if (error) {
      console.error(
        "Błąd Supabase w backendzie podczas pobierania klientów:",
        error
      );
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error("Błąd serwera podczas obsługi zapytania /api/clients:", err);
    res.status(500).json({ error: "Wewnętrzny błąd serwera" });
  }
});

// TODO: Tutaj będziesz dodawać kolejne trasy API dla projektu
// np. dla klientów, projektów, materiałów itd.

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`Serwer backend działa na porcie ${PORT}`);
  console.log(`Dostępny pod adresem: http://localhost:${PORT}`);
});
