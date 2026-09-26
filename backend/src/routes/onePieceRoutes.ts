import { Router } from "express";

import {
    buscarFrutas,
    buscarPersonajes,
} from "../controllers/onePieceController";

const router = Router();

router.get("/personajes", buscarPersonajes);

router.get("/frutas", buscarFrutas);

export default router;