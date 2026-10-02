import "dotenv/config";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "No se encontró DATABASE_URL en el archivo .env"
  );
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

const pokemonNames = [
  "pikachu",
  "charizard",
  "bulbasaur",
  "squirtle",
  "eevee",
  "lucario",
  "gengar",
  "greninja",
  "gardevoir",
  "pyroar-male",
];

async function obtenerPokemon(nombre: string) {
  const response = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${nombre}`
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener el Pokémon "${nombre}".`
    );
  }

  return response.json();
}

async function insertarPokemon(data: any) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // =====================================================
    // 1. SPECIES
    // =====================================================

    const speciesId = Number(
      data.species.url
        .split("/")
        .filter(Boolean)
        .pop()
    );

    await client.query(
      `
      INSERT INTO species (
        id,
        name,
        url
      )
      VALUES ($1, $2, $3)

      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        url = EXCLUDED.url
      `,
      [
        speciesId,
        data.species.name,
        data.species.url,
      ]
    );

    // =====================================================
    // 2. POKEMON
    // =====================================================

    await client.query(
      `
      INSERT INTO pokemon (
        id,
        name,
        height,
        weight,
        species_id
      )
      VALUES ($1, $2, $3, $4, $5)

      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        height = EXCLUDED.height,
        weight = EXCLUDED.weight,
        species_id = EXCLUDED.species_id
      `,
      [
        data.id,
        data.name,
        data.height,
        data.weight,
        speciesId,
      ]
    );

    // =====================================================
    // 3. SPRITES
    // =====================================================

    await client.query(
      `
      INSERT INTO sprites (
        pokemon_id,
        front_default,
        front_female,
        front_shiny,
        front_shiny_female
      )
      VALUES ($1, $2, $3, $4, $5)

      ON CONFLICT (pokemon_id)
      DO UPDATE SET
        front_default = EXCLUDED.front_default,
        front_female = EXCLUDED.front_female,
        front_shiny = EXCLUDED.front_shiny,
        front_shiny_female = EXCLUDED.front_shiny_female
      `,
      [
        data.id,
        data.sprites.front_default,
        data.sprites.front_female,
        data.sprites.front_shiny,
        data.sprites.front_shiny_female,
      ]
    );

    // =====================================================
    // 4. STATS
    // =====================================================

    for (const stat of data.stats) {
      await client.query(
        `
        INSERT INTO pokemon_stats (
          pokemon_id,
          stat_name,
          base_stat
        )
        VALUES ($1, $2, $3)

        ON CONFLICT (pokemon_id, stat_name)
        DO UPDATE SET
          base_stat = EXCLUDED.base_stat
        `,
        [
          data.id,
          stat.stat.name,
          stat.base_stat,
        ]
      );
    }

    // =====================================================
    // 5. MOVES
    // =====================================================

    for (const pokemonMove of data.moves) {
      const moveName = pokemonMove.move.name;

      const moveId = Number(
        pokemonMove.move.url
          .split("/")
          .filter(Boolean)
          .pop()
      );

      // ---------------------------------------------------
      // Insertar movimiento
      // ---------------------------------------------------

      await client.query(
        `
        INSERT INTO moves (
          id,
          name
        )
        VALUES ($1, $2)

        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name
        `,
        [
          moveId,
          moveName,
        ]
      );

      // ---------------------------------------------------
      // Relacionar Pokémon con movimiento
      // ---------------------------------------------------

      await client.query(
        `
        INSERT INTO pokemon_moves (
          pokemon_id,
          move_id
        )
        VALUES ($1, $2)

        ON CONFLICT DO NOTHING
        `,
        [
          data.id,
          moveId,
        ]
      );
    }

    await client.query("COMMIT");

    console.log(
      `✓ ${data.name} guardado correctamente`
    );

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      `✗ Error guardando ${data.name}`
    );

    throw error;

  } finally {

    client.release();
  }
}

async function main() {
  console.log("");
  console.log("==========================================");
  console.log("     CARGA DE POKÉMON EN RAILWAY");
  console.log("==========================================");
  console.log("");

  try {

    for (const nombre of pokemonNames) {

      console.log(
        `Obteniendo ${nombre} desde PokeAPI...`
      );

      const pokemon = await obtenerPokemon(nombre);

      await insertarPokemon(pokemon);
    }

    console.log("");
    console.log("==========================================");
    console.log("   ✓ CARGA COMPLETADA CORRECTAMENTE");
    console.log("==========================================");
    console.log("");

  } catch (error) {

    console.error("");
    console.error("==========================================");
    console.error("   ✗ ERROR DURANTE LA CARGA");
    console.error("==========================================");
    console.error("");
    console.error(error);

  } finally {

    await pool.end();
  }
}

main();