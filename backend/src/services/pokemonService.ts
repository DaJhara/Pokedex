import { pool } from "../config/database";
import { Pokemon } from "../types/pokemon";

export async function obtenerPokemon(
  nombre: string
): Promise<Pokemon> {
  const nombrePokemon = nombre
    .trim()
    .toLowerCase();

  const pokemonResult = await pool.query(
    `
    SELECT
      p.id,
      p.name,
      p.height,
      p.weight,
      s.name AS species_name,
      s.url AS species_url
    FROM pokemon p
    LEFT JOIN species s
      ON p.species_id = s.id
    WHERE p.name = $1
       OR p.id::text = $1
    LIMIT 1
    `,
    [nombrePokemon]
  );

  if (pokemonResult.rows.length === 0) {
    throw new Error("Pokémon no encontrado");
  }

  const pokemon = pokemonResult.rows[0];

  const spritesResult = await pool.query(
    `
    SELECT
      front_default,
      front_female,
      front_shiny,
      front_shiny_female
    FROM sprites
    WHERE pokemon_id = $1
    `,
    [pokemon.id]
  );

  const statsResult = await pool.query(
    `
    SELECT
      stat_name,
      base_stat
    FROM pokemon_stats
    WHERE pokemon_id = $1
    ORDER BY id
    `,
    [pokemon.id]
  );

  const movesResult = await pool.query(
    `
    SELECT
      m.name
    FROM pokemon_moves pm
    INNER JOIN moves m
      ON pm.move_id = m.id
    WHERE pm.pokemon_id = $1
    ORDER BY m.id
    `,
    [pokemon.id]
  );

  const sprites = spritesResult.rows[0] || {
    front_default: null,
    front_female: null,
    front_shiny: null,
    front_shiny_female: null,
  };

  const resultado: Pokemon = {
    id: pokemon.id,
    name: pokemon.name,
    height: pokemon.height,
    weight: pokemon.weight,

    sprites: {
      front_default: sprites.front_default,
      front_female: sprites.front_female,
      front_shiny: sprites.front_shiny,
      front_shiny_female:
        sprites.front_shiny_female,
    },

    stats: statsResult.rows.map((stat) => ({
      base_stat: stat.base_stat,
      stat: {
        name: stat.stat_name,
      },
    })),

    moves: movesResult.rows.map((move) => ({
      move: {
        name: move.name,
      },
    })),

    species: {
      name: pokemon.species_name,
      url: pokemon.species_url,
    },
  };

  return resultado;
}