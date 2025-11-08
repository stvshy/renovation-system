require("dotenv").config(); // Ładuje zmienne środowiskowe z .env

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000; // Port serwera, domyślnie 5000

// Middleware
app.use(cors()); // Włącza CORS dla wszystkich żądań
app.use(express.json()); // Umożliwia parsowanie ciała żądań w formacie JSON

// Podstawowa trasa testowa
app.get("/", (req, res) => {
  res.send("API działa! Witaj w Ekipy Budowlano-Remontowe API!");
});

// TODO: trasy dla modułów (np. projects, clients, materials)

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`Serwer backend działa na porcie ${PORT}`);
  console.log(`Dostępny pod adresem: http://localhost:${PORT}`);
});
