import { Router } from "express";

import {
    buscarPokemon,
} from "../controllers/pokemonController";

const router = Router();

/**
 * @swagger
 * /api/pokemon/{nombre}:
 *   get:
 *     summary: Buscar un Pokémon
 *     description: Busca un Pokémon por nombre o por ID.
 *     tags:
 *       - Pokémon
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         description: Nombre o ID del Pokémon.
 *         schema:
 *           type: string
 *         example: pikachu
 *     responses:
 *       200:
 *         description: Pokémon encontrado correctamente.
 *       404:
 *         description: Pokémon no encontrado.
 */
router.get(
  "/:nombre",
  buscarPokemon
);

export default router;