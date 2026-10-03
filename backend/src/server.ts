import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import swaggerUi from "swagger-ui-express";

import { swaggerSpec } from "./config/swagger";
import onePieceRoutes from "./routes/onePieceRoutes";
import pokemonRoutes from "./routes/pokemonRoutes";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Backend ejecutándose en el puerto ${PORT}`
  );
});