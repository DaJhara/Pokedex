import { Pokemon } from "../types/pokemon";

const POKEAPI_URL = "https://pokeapi.co/api/v2/pokemon";

export async function obtenerPokemon(
  nombre: string
): Promise<Pokemon> {

  const nombrePokemon = nombre
    .trim()
    .toLowerCase();

  const respuesta = await fetch(
    `${POKEAPI_URL}/${nombrePokemon}`
  );

  if (!respuesta.ok) {
    throw new Error("Pokémon no encontrado");
  }

  const datos: Pokemon =
    await respuesta.json();

  return datos;
}