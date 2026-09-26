import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import onePieceRoutes from "./routes/onePieceRoutes";
import pokemonRoutes from "./routes/pokemonRoutes";

dotenv.config();

const app = express();

const PORT =
  process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    mensaje: "Backend Pokémon funcionando",
  });
});

app.use(
  "/api/pokemon",
  pokemonRoutes
);

app.use(
  "/api/onepiece",
  onePieceRoutes
);

app.listen(PORT, () => {
  console.log(
    `Backend ejecutándose en http://localhost:${PORT}`
  );
});