
import http from "node:http";
import { URL } from "node:url";
import { pool } from "./database.js";

const PORT = Number(process.env.PORT) || 3000;

function enviarJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  res.end(JSON.stringify(data));
}

function obtenerOpenAPI() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Microservicio de Docentes",
      version: "2.0.0",
      description:
        "API de docentes, facultades y programas académicos con PostgreSQL y Node.js nativo.",
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
        get: {
          summary: "Consultar docentes",
          parameters: [
            {
              name: "nombre",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Busca por nombres o apellidos",
            },
            {
              name: "facultad",
              in: "query",
              required: false,
              schema: { type: "string" },
            },
            {
              name: "programa",
              in: "query",
              required: false,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Lista de docentes",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Docente" },
                  },
                },
              },
            },
            500: { description: "Error interno del servidor" },
          },
        },
      },
      "/api/docentes/{id}": {
        get: {
          summary: "Consultar un docente por ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: {
              description: "Docente encontrado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Docente" },
                },
              },
            },
            404: { description: "Docente no encontrado" },
          },
        },
      },
      "/api/facultades": {
        get: {
          summary: "Listar facultades",
          responses: {
            200: {
              description: "Lista de facultades",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Facultad" },
                  },
                },
              },
            },
          },
        },
      },
      "/api/programas": {
        get: {
          summary: "Listar programas",
          parameters: [
            {
              name: "facultad",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filtrar por nombre de facultad",
            },
          ],
          responses: {
            200: {
              description: "Lista de programas",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Docente: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nombres: { type: "string" },
            apellidos: { type: "string" },
            facultad: { type: "string" },
            programa: { type: "string" },
            correo: { type: "string" },
            perfil: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Facultad: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nombre: { type: "string" },
            descripcion: { type: "string", nullable: true },
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
  <title>Swagger - Microservicio Docentes</title>
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

const servidor = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (req.method !== "GET") {
    return enviarJSON(res, 405, {
      error: "Método no permitido. Utiliza GET.",
    });
  }

  const url = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  const ruta = url.pathname;

  try {
    if (ruta === "/") {
      return enviarJSON(res, 200, {
        servicio: "Microservicio de Docentes",
        estado: "activo",
        documentacion: "/docs",
      });
    }

    if (ruta === "/health") {
      await pool.query("SELECT 1");

      return enviarJSON(res, 200, {
        estado: "ok",
        baseDatos: "conectada",
      });
    }

    if (ruta === "/openapi.json") {
      return enviarJSON(res, 200, obtenerOpenAPI());
    }

    if (ruta === "/docs") {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });
      return res.end(obtenerHTMLSwagger());
    }

    if (ruta === "/api/docentes") {
      const nombre = url.searchParams.get("nombre")?.trim();
      const facultad = url.searchParams.get("facultad")?.trim();
      const programa = url.searchParams.get("programa")?.trim();

      const resultado = await pool.query(
        `SELECT
           d.id,
           d.nombres,
           d.apellidos,
           f.nombre AS facultad,
           p.nombre AS programa,
           d.correo,
           d.perfil,
           d.created_at
         FROM docentes d
         JOIN programas p ON p.id = d.programa_id
         JOIN facultades f ON f.id = p.facultad_id
         WHERE
           ($1::text IS NULL OR
             d.nombres ILIKE $1 OR d.apellidos ILIKE $1)
           AND ($2::text IS NULL OR f.nombre ILIKE $2)
           AND ($3::text IS NULL OR p.nombre ILIKE $3)
         ORDER BY d.apellidos, d.nombres`,
        [
          nombre ? `%${nombre}%` : null,
          facultad ? `%${facultad}%` : null,
          programa ? `%${programa}%` : null,
        ]
      );

      return enviarJSON(res, 200, resultado.rows);
    }

    const coincidenciaDocente = ruta.match(
      /^\/api\/docentes\/(\d+)$/
    );

    if (coincidenciaDocente) {
      const id = Number(coincidenciaDocente[1]);

      const resultado = await pool.query(
        `SELECT
           d.id,
           d.nombres,
           d.apellidos,
           f.nombre AS facultad,
           p.nombre AS programa,
           d.correo,
           d.perfil,
           d.created_at
         FROM docentes d
         JOIN programas p ON p.id = d.programa_id
         JOIN facultades f ON f.id = p.facultad_id
         WHERE d.id = $1`,
        [id]
      );

      if (resultado.rows.length === 0) {
        return enviarJSON(res, 404, {
          error: "No se encontró un docente con ese ID.",
        });
      }

      return enviarJSON(res, 200, resultado.rows[0]);
    }

    if (ruta === "/api/facultades") {
      const resultado = await pool.query(
        `SELECT id, nombre, descripcion
         FROM facultades
         ORDER BY nombre`
      );

      return enviarJSON(res, 200, resultado.rows);
    }

    if (ruta === "/api/programas") {
      const facultad = url.searchParams.get("facultad")?.trim();

      const resultado = await pool.query(
        `SELECT
           p.id,
           p.nombre,
           p.descripcion,
           f.id AS facultad_id,
           f.nombre AS facultad
         FROM programas p
         JOIN facultades f ON f.id = p.facultad_id
         WHERE ($1::text IS NULL OR f.nombre ILIKE $1)
         ORDER BY f.nombre, p.nombre`,
        [facultad ? `%${facultad}%` : null]
      );

      return enviarJSON(res, 200, resultado.rows);
    }

    return enviarJSON(res, 404, {
      error: "Ruta no encontrada.",
    });
  } catch (error) {
    console.error("Error procesando solicitud:", error);

    return enviarJSON(res, 500, {
      error: "Error interno al procesar la solicitud.",
    });
  }
});

servidor.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Microservicio de docentes escuchando en el puerto ${PORT}.`
  );
});