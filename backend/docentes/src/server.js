import http from "node:http";

import { URL } from "node:url";

import {
  inicializarBaseDatos,
  pool
} from "./database.js";

const PORT = Number(process.env.PORT) || 3000;

const servidor = http.createServer(
  async (req, res) => {
    // Permitir peticiones desde Expo Web.
    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

    const ruta = url.pathname;

    try {
      // Comprobar el estado del servicio.
      if (req.method === "GET" && ruta === "/") {
        return responderJSON(res, 200, {
          mensaje: "Microservicio de docentes funcionando."
        });
      }

      if (
        req.method === "GET" &&
        ruta === "/health"
      ) {
        await pool.query("SELECT 1");

        return responderJSON(res, 200, {
          estado: "ok",
          baseDatos: "conectada"
        });
      }

      // Especificación OpenAPI.
      if (
        req.method === "GET" &&
        ruta === "/openapi.json"
      ) {
        return responderJSON(res, 200, {
          openapi: "3.0.3",
          info: {
            title: "Microservicio de Docentes UNINPAHU",
            version: "1.0.0",
            description:
              "API REST para consultar docentes de ejemplo almacenados en PostgreSQL."
          },
          servers: [
            {
              url: obtenerBaseURL(req)
            }
          ],
          paths: {
            "/api/docentes": {
              get: {
                summary: "Listar y buscar docentes",
                description:
                  "Sin parámetros devuelve todos los docentes. El parámetro nombre permite filtrar por nombres o apellidos.",
                parameters: [
                  {
                    name: "nombre",
                    in: "query",
                    required: false,
                    schema: {
                      type: "string"
                    },
                    example: "Laura",
                    description:
                      "Texto para buscar en nombres y apellidos."
                  }
                ],
                responses: {
                  "200": {
                    description: "Lista de docentes.",
                    content: {
                      "application/json": {
                        schema: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/Docente"
                          }
                        }
                      }
                    }
                  },
                  "500": {
                    description: "Error interno del servidor."
                  }
                }
              }
            },
            "/api/docentes/{id}": {
              get: {
                summary: "Consultar un docente por ID",
                parameters: [
                  {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                      type: "integer",
                      minimum: 1
                    },
                    example: 1
                  }
                ],
                responses: {
                  "200": {
                    description: "Docente encontrado.",
                    content: {
                      "application/json": {
                        schema: {
                          $ref: "#/components/schemas/Docente"
                        }
                      }
                    }
                  },
                  "400": {
                    description: "Identificador inválido."
                  },
                  "404": {
                    description: "Docente no encontrado."
                  }
                }
              }
            }
          },
          components: {
            schemas: {
              Docente: {
                type: "object",
                properties: {
                  id: {
                    type: "integer",
                    example: 1
                  },
                  nombres: {
                    type: "string",
                    example: "Laura"
                  },
                  apellidos: {
                    type: "string",
                    example: "Martínez Rojas"
                  },
                  facultad: {
                    type: "string",
                    example: "Facultad de Ingeniería"
                  },
                  programa: {
                    type: "string",
                    example: "Ingeniería de Software"
                  },
                  correo: {
                    type: "string",
                    example: "laura.martinez@example.com"
                  },
                  perfil: {
                    type: "string",
                    nullable: true
                  },
                  created_at: {
                    type: "string",
                    format: "date-time"
                  }
                }
              }
            }
          }
        });
      }

      // Interfaz Swagger UI servida desde CDN.
      if (
        req.method === "GET" &&
        (ruta === "/docs" || ruta === "/docs/")
      ) {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8"
        });

        res.end(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Swagger - Docentes UNINPAHU</title>
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
</html>`);
        return;
      }

      // GET /api/docentes
      // GET /api/docentes?nombre=Laura
      if (
        req.method === "GET" &&
        ruta === "/api/docentes"
      ) {
        const nombre = (
          url.searchParams.get("nombre") || ""
        ).trim();

        let resultado;

        if (nombre) {
          resultado = await pool.query(
            `
              SELECT *
              FROM docentes
              WHERE nombres ILIKE $1
                 OR apellidos ILIKE $1
              ORDER BY apellidos, nombres;
            `,
            [`%${nombre}%`]
          );
        } else {
          resultado = await pool.query(
            `
              SELECT *
              FROM docentes
              ORDER BY apellidos, nombres;
            `
          );
        }

        return responderJSON(
          res,
          200,
          resultado.rows
        );
      }

      // GET /api/docentes/1
      const coincidencia = ruta.match(
        /^\/api\/docentes\/([^/]+)$/
      );

      if (
        req.method === "GET" &&
        coincidencia
      ) {
        const idTexto = coincidencia[1];

        if (!/^[1-9]\d*$/.test(idTexto)) {
          return responderJSON(res, 400, {
            error: "El ID debe ser un entero positivo."
          });
        }

        const resultado = await pool.query(
          `
            SELECT *
            FROM docentes
            WHERE id = $1;
          `,
          [Number(idTexto)]
        );

        if (resultado.rows.length === 0) {
          return responderJSON(res, 404, {
            error: "No se encontró el docente solicitado."
          });
        }

        return responderJSON(
          res,
          200,
          resultado.rows[0]
        );
      }

      // Ruta no encontrada.
      return responderJSON(res, 404, {
        error: "Ruta no encontrada."
      });
    } catch (error) {
      console.error("Error en el servidor:", error);

      if (!res.headersSent) {
        return responderJSON(res, 500, {
          error: "Error interno del servidor."
        });
      }

      res.end();
    }
  }
);

function responderJSON(res, estado, datos) {
  res.writeHead(estado, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(JSON.stringify(datos));
}

function obtenerBaseURL(req) {
  const protocolo =
    req.headers["x-forwarded-proto"] || "http";

  return `${protocolo}://${req.headers.host}`;
}

async function iniciarServidor() {
  try {
    await inicializarBaseDatos();

    servidor.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Microservicio de docentes escuchando en el puerto ${PORT}.`
      );
    });
  } catch (error) {
    console.error(
      "No fue posible iniciar el microservicio:",
      error
    );

    await pool.end();
    process.exit(1);
  }
}

iniciarServidor();