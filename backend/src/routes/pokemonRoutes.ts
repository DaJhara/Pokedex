import { Router } from "express";
import {
    buscarPokemon,
} from "../controllers/pokemonController";

const router = Router();

router.get("/:nombre", buscarPokemon);

export default router;