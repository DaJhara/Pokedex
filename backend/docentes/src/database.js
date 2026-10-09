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
  ssl: process.env.PGSSL === "disable"
    ? false
    : { rejectUnauthorized: false },
});

pool.on("error", (error) => {
  console.error(
    "Error inesperado en el pool de PostgreSQL:",
    error
  );
});

export async function inicializarBaseDatos() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS docentes (
      id SERIAL PRIMARY KEY,
      nombres VARCHAR(100) NOT NULL,
      apellidos VARCHAR(100) NOT NULL,
      facultad VARCHAR(150) NOT NULL,
      programa VARCHAR(150) NOT NULL,
      correo VARCHAR(180) NOT NULL UNIQUE,
      perfil VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const docentesEjemplo = [
    {
      nombres: "Laura",
      apellidos: "Martínez Rojas",
      facultad: "Facultad de Ingeniería",
      programa: "Ingeniería de Software",
      correo: "laura.martinez@example.com",
      perfil: "Docente de programación y desarrollo de software."
    },
    {
      nombres: "Andrés",
      apellidos: "Gómez Torres",
      facultad: "Facultad de Ingeniería",
      programa: "Ingeniería de Sistemas",
      correo: "andres.gomez@example.com",
      perfil: "Docente de bases de datos y arquitectura de software."
    },
    {
      nombres: "Camila",
      apellidos: "Rodríguez Pérez",
      facultad: "Facultad de Comunicación",
      programa: "Comunicación Social",
      correo: "camila.rodriguez@example.com",
      perfil: "Docente de comunicación digital y medios."
    },
    {
      nombres: "Daniel",
      apellidos: "Castro Ramírez",
      facultad: "Facultad de Ciencias Económicas",
      programa: "Administración de Empresas",
      correo: "daniel.castro@example.com",
      perfil: "Docente de administración y gestión de proyectos."
    },
    {
      nombres: "Valentina",
      apellidos: "López Herrera",
      facultad: "Facultad de Ingeniería",
      programa: "Ingeniería de Software",
      correo: "valentina.lopez@example.com",
      perfil: "Docente de desarrollo web y metodologías ágiles."
    },
    {
      nombres: "Santiago",
      apellidos: "Moreno Díaz",
      facultad: "Facultad de Comunicación",
      programa: "Producción Audiovisual",
      correo: "santiago.moreno@example.com",
      perfil: "Docente de producción audiovisual y narrativa."
    }
  ];

  for (const docente of docentesEjemplo) {
    await pool.query(
      `
        INSERT INTO docentes (
          nombres,
          apellidos,
          facultad,
          programa,
          correo,
          perfil
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (correo) DO NOTHING;
      `,
      [
        docente.nombres,
        docente.apellidos,
        docente.facultad,
        docente.programa,
        docente.correo,
        docente.perfil
      ]
    );
  }

  console.log(
    "Tabla docentes preparada y registros de ejemplo verificados."
  );
}

export { pool };
