
import http from "node:http";
import { pool } from "./database.js";

const PORT = process.env.PORT || 3000;

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Microservicio de Eliminación de Docentes",
    version: "1.0.0",
    description:
      "Microservicio Node.js para eliminar docentes almacenados en PostgreSQL.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/health": {
      get: {
        summary: "Verificar el estado del servicio y la base de datos",
        responses: {
          200: { description: "Servicio y base de datos disponibles" },
          500: { description: "Error de conexión" },
        },
      },
    },
    "/api/docentes/{id}": {
      delete: {
        summary: "Eliminar un docente por su ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          200: { description: "Docente eliminado correctamente" },
          400: { description: "ID inválido" },
          404: { description: "Docente no encontrado" },
          409: { description: "El docente tiene registros relacionados" },
          500: { description: "Error interno del servidor" },
        },
      },
    },
  },
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
}

function sendHtml(res, html) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(html);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const ruta = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  try {
    if (req.method === "GET" && ruta === "/") {
      return sendJson(res, 200, {
        mensaje: "Microservicio de eliminación de docentes funcionando.",
        documentacion: "/docs",
      });
    }

    if (req.method === "GET" && ruta === "/health") {
      await pool.query("SELECT 1");
      return sendJson(res, 200, {
        estado: "ok",
        baseDatos: "conectada",
      });
    }

    if (req.method === "GET" && ruta === "/openapi.json") {
      return sendJson(res, 200, openApiSpec);
    }

    if (req.method === "GET" && ruta === "/docs") {
      return sendHtml(
        res,
        `<!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Swagger - Eliminación de Docentes</title>
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
        </html>`
      );
    }

    const coincidencia = ruta.match(/^\/api\/docentes\/(\d+)$/);

    if (req.method === "DELETE" && coincidencia) {
      const id = Number(coincidencia[1]);

      if (!Number.isSafeInteger(id) || id < 1) {
        return sendJson(res, 400, {
          error: "El ID debe ser un entero positivo.",
        });
      }

      const resultado = await pool.query(
        `DELETE FROM docentes
         WHERE id = $1
         RETURNING id, nombres, apellidos, correo`,
        [id]
      );

      if (resultado.rowCount === 0) {
        return sendJson(res, 404, {
          error: "No se encontró un docente con ese ID.",
        });
      }

      return sendJson(res, 200, {
        mensaje: "Docente eliminado correctamente.",
        docente: resultado.rows[0],
      });
    }

    return sendJson(res, 404, { error: "Ruta no encontrada." });
  } catch (error) {
    console.error("Error en el microservicio:", error);

    if (error.code === "23503") {
      return sendJson(res, 409, {
        error:
          "No se puede eliminar el docente porque existen registros relacionados.",
      });
    }

    return sendJson(res, 500, {
      error: "Ocurrió un error interno al procesar la solicitud.",
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Microservicio de eliminación escuchando en el puerto ${PORT}`);
});
