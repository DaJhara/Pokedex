import http from "node:http";
import { URL } from "node:url";
import { pool } from "./database.js";

const PORT = Number(process.env.PORT) || 3000;

function enviarJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  res.end(JSON.stringify(data));
}

function obtenerOpenAPI() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Microservicio de Creación de Docentes",
      version: "1.0.0",
      description:
        "Servicio independiente para registrar docentes en PostgreSQL.",
    },
    servers: [{ url: "/" }],
    paths: {
      "/health": {
        get: {
          summary: "Verificar el estado del servicio y PostgreSQL",
          responses: {
            200: { description: "Servicio y base de datos disponibles" },
            500: { description: "Error de conexión" },
          },
        },
      },
      "/api/docentes": {
        post: {
          summary: "Registrar un docente",
          description:
            "Crea un docente asociado a un programa académico existente.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/NuevoDocente",
                },
                example: {
                  nombres: "Laura Sofía",
                  apellidos: "Martínez Gómez",
                  correo: "laura.martinez@example.com",
                  perfil: "Docente de ingeniería",
                  foto_url: "https://example.com/foto.jpg",
                  programa_id: 3,
                },
              },
            },
          },
          responses: {
            201: {
              description: "Docente creado correctamente",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Docente",
                  },
                },
              },
            },
            400: { description: "Datos inválidos o incompletos" },
            409: { description: "El correo ya está registrado" },
            500: { description: "Error interno del servidor" },
          },
        },
      },
    },
    components: {
      schemas: {
        NuevoDocente: {
          type: "object",
          required: ["nombres", "apellidos", "correo", "programa_id"],
          properties: {
            nombres: { type: "string", example: "Laura Sofía" },
            apellidos: { type: "string", example: "Martínez Gómez" },
            correo: {
              type: "string",
              format: "email",
              example: "laura.martinez@example.com",
            },
            perfil: {
              type: "string",
              nullable: true,
              example: "Docente de ingeniería",
            },
            foto_url: {
              type: "string",
              format: "uri",
              nullable: true,
              example: "https://example.com/foto.jpg",
            },
            programa_id: {
              type: "integer",
              minimum: 1,
              example: 3,
            },
          },
        },
        Docente: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nombres: { type: "string" },
            apellidos: { type: "string" },
            correo: { type: "string" },
            perfil: { type: "string", nullable: true },
            foto_url: { type: "string", nullable: true },
            programa_id: { type: "integer" },
            programa: { type: "string" },
            facultad: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
  };
}

function obtenerHTMLSwagger() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Swagger - Creación de Docentes</title>
  <link rel="stylesheet"
    href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/openapi.json",
      dom_id: "#swagger-ui"
    });
  </script>
</body>
</html>`;
}

async function leerJSON(req) {
  let contenido = "";

  for await (const fragmento of req) {
    contenido += fragmento;

    if (contenido.length > 100_000) {
      const error = new Error("El cuerpo de la solicitud es demasiado grande.");
      error.statusCode = 413;
      throw error;
    }
  }

  try {
    return JSON.parse(contenido);
  } catch {
    const error = new Error("El cuerpo debe contener un JSON válido.");
    error.statusCode = 400;
    throw error;
  }
}

const servidor = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  const url = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  const ruta = url.pathname;

  try {
    if (req.method === "GET" && ruta === "/") {
      return enviarJSON(res, 200, {
        servicio: "Microservicio de Creación de Docentes",
        estado: "activo",
        documentacion: "/docs",
      });
    }

    if (req.method === "GET" && ruta === "/health") {
      await pool.query("SELECT 1");

      return enviarJSON(res, 200, {
        estado: "ok",
        baseDatos: "conectada",
      });
    }

    if (req.method === "GET" && ruta === "/openapi.json") {
      return enviarJSON(res, 200, obtenerOpenAPI());
    }

    if (req.method === "GET" && ruta === "/docs") {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });
      return res.end(obtenerHTMLSwagger());
    }

    if (ruta === "/api/docentes" && req.method === "POST") {
      const datos = await leerJSON(req);

      const nombres = datos.nombres;
      const apellidos = datos.apellidos;
      const correo = datos.correo;
      const perfil = datos.perfil ?? null;
      const fotoUrl = datos.foto_url ?? null;
      const programaId = datos.programa_id;

      if (
        typeof nombres !== "string" ||
        !nombres.trim() ||
        typeof apellidos !== "string" ||
        !apellidos.trim() ||
        typeof correo !== "string" ||
        !correo.trim() ||
        !Number.isInteger(programaId) ||
        programaId <= 0
      ) {
        return enviarJSON(res, 400, {
          error:
            "nombres, apellidos, correo y programa_id son obligatorios. El ID del programa debe ser un entero positivo.",
        });
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
      ) {
        return enviarJSON(res, 400, {
          error: "El correo electrónico no tiene un formato válido.",
        });
      }

      if (
        perfil !== null &&
        typeof perfil !== "string"
      ) {
        return enviarJSON(res, 400, {
          error: "perfil debe ser un texto o null.",
        });
      }

      if (
        fotoUrl !== null &&
        (typeof fotoUrl !== "string" ||
          !/^https?:\/\/\S+$/i.test(fotoUrl))
      ) {
        return enviarJSON(res, 400, {
          error: "foto_url debe ser una URL HTTP/HTTPS válida o null.",
        });
      }

      const programa = await pool.query(
        "SELECT id FROM programas WHERE id = $1",
        [programaId]
      );

      if (programa.rows.length === 0) {
        return enviarJSON(res, 400, {
          error: "El programa académico indicado no existe.",
        });
      }

      const resultado = await pool.query(
        `INSERT INTO docentes
          (nombres, apellidos, correo, perfil, foto_url, programa_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          nombres.trim(),
          apellidos.trim(),
          correo.trim(),
          perfil?.trim() || null,
          fotoUrl?.trim() || null,
          programaId,
        ]
      );

      const idCreado = resultado.rows[0].id;

      const docente = await pool.query(
        `SELECT
           d.id,
           d.nombres,
           d.apellidos,
           d.correo,
           d.perfil,
           d.foto_url,
           d.programa_id,
           p.nombre AS programa,
           f.nombre AS facultad,
           d.created_at
         FROM docentes d
         JOIN programas p ON p.id = d.programa_id
         JOIN facultades f ON f.id = p.facultad_id
         WHERE d.id = $1`,
        [idCreado]
      );

      return enviarJSON(res, 201, docente.rows[0]);
    }

    if (ruta === "/api/docentes" && req.method !== "GET") {
      return enviarJSON(res, 405, {
        error: "Método no permitido para esta ruta.",
      });
    }

    return enviarJSON(res, 404, {
      error: "Ruta no encontrada.",
    });
  } catch (error) {
    console.error("Error procesando solicitud:", error);

    if (error.statusCode) {
      return enviarJSON(res, error.statusCode, {
        error: error.message,
      });
    }

    if (error.code === "23505") {
      return enviarJSON(res, 409, {
        error: "Ya existe un registro con uno de los valores únicos enviados.",
      });
    }

    if (error.code === "23503") {
      return enviarJSON(res, 400, {
        error: "El programa académico indicado no existe.",
      });
    }

    return enviarJSON(res, 500, {
      error: "Error interno al registrar el docente.",
    });
  }
});

servidor.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Microservicio de creación de docentes escuchando en el puerto ${PORT}.`
  );
});