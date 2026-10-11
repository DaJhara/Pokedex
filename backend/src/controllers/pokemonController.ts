import { Request, Response } from "express";
import { obtenerPokemon } from "../services/pokemonService";

export async function buscarPokemon(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const nombre = req.params.nombre;

    if (!nombre || typeof nombre !== "string") {
      res.status(400).json({
        mensaje: "Debes proporcionar el nombre del Pokémon",
      });
      return;
    }

    const pokemon = await obtenerPokemon(nombre);

    res.status(200).json(pokemon);
  } catch (error) {
    console.error(error);

    res.status(404).json({
      mensaje: "Pokémon no encontrado",
    });
  }
}