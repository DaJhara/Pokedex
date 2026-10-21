import { Request, Response } from "express";
import {
  listarPokemonRegistrados,
  obtenerPokemon,
} from "../services/pokemonService";

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


export async function listarPokemonCatalogo(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const pokemon = await listarPokemonRegistrados();
    res.status(200).json(pokemon);
  } catch (error) {
    console.error("Error al listar Pokémon:", error);
    res.status(500).json({
      mensaje: "No se pudo obtener el catálogo de Pokémon",
    });
  }
}