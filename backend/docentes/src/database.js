
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No se ha configurado la variable DATABASE_URL."
  );
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.PGSSL === "disable"
      ? false
      : { rejectUnauthorized: false },
});

pool.on("error", (error) => {
  console.error(
    "Error inesperado en la conexión con PostgreSQL:",
    error
  );
});

export { pool };
