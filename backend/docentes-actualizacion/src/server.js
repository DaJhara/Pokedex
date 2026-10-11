
import http from "node:http";
import { pool } from "./database.js";

const PORT = process.env.PORT || 3000;

const camposPermitidos = [
  "nombres",
  "apellidos",
  "correo",
  "perfil",
  "foto_url",
  "programa_id",
];

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Microservicio de Actualización de Docentes",
    version: "1.0.0",
    description:
      "Microservicio Node.js para actualizar docentes almacenados en PostgreSQL.",
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
      put: {
        summary: "Actualizar un docente por su ID",
        description:
          "Permite actualizar uno o varios campos de un docente existente.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nombres: { type: "string", example: "Carlos" },
                  apellidos: { type: "string", example: "Gómez" },
                  correo: {
                    type: "string",
                    format: "email",
                    example: "carlos.gomez@example.com",
                  },
                  perfil: {
                    type: "string",
                    nullable: true,
                    example: "Docente de programación",
                  },
                  foto_url: {
                    type: "string",
                    format: "uri",
                    nullable: true,
                  },
                  programa_id: { type: "integer", example: 1 },
                },
                minProperties: 1,
                additionalProperties: false,
              },
              example: {
                nombres: "Carlos",
                apellidos: "Gómez",
                correo: "carlos.gomez@example.com",
                perfil: "Docente actualizado",
                foto_url: null,
                programa_id: 1,
              },
            },
          },
        },
        responses: {
          200: { description: "Docente actualizado correctamente" },
          400: { description: "Datos inválidos" },
          404: { description: "Docente no encontrado" },
          409: { description: "Correo duplicado" },
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
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
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

async function readJsonBody(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk;

    if (body.length > 1_000_000) {
      const error = new Error("El cuerpo de la petición es demasiado grande.");
      error.status = 413;
      throw error;
    }
  }

  if (!body.trim()) {
    const error = new Error("Debes enviar un cuerpo JSON.");
    error.status = 400;
    throw error;
  }

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("El cuerpo debe contener un JSON válido.");
    error.status = 400;
    throw error;
  }
}

async function obtenerDocente(id) {
  const resultado = await pool.query(
    `SELECT
       d.id,
       d.nombres,
       d.apellidos,
       d.correo,
       d.perfil,
       d.foto_url,
       d.programa_id,
       d.created_at,
       p.nombre AS programa,
       f.nombre AS facultad
     FROM docentes d
     JOIN programas p ON d.programa_id = p.id
     JOIN facultades f ON p.facultad_id = f.id
     WHERE d.id = $1`,
    [id]
  );

  return resultado.rows[0] || null;
}

async function actualizarDocente(id, datos) {
  if (
    !datos ||
    typeof datos !== "object" ||
    Array.isArray(datos)
  ) {
    return {
      status: 400,
      data: { error: "El cuerpo debe ser un objeto JSON válido." },
    };
  }

  const campos = Object.keys(datos);

  if (campos.length === 0) {
    return {
      status: 400,
      data: { error: "Debes enviar al menos un campo para actualizar." },
    };
  }

  const desconocidos = campos.filter(
    (campo) => !camposPermitidos.includes(campo)
  );

  if (desconocidos.length > 0) {
    return {
      status: 400,
      data: {
        error: "Hay campos no permitidos.",
        campos: desconocidos,
      },
    };
  }

  for (const campo of ["nombres", "apellidos", "correo"]) {
    if (campo in datos) {
      if (
        typeof datos[campo] !== "string" ||
        !datos[campo].trim()
      ) {
        return {
          status: 400,
          data: { error: `El campo ${campo} no puede estar vacío.` },
        };
      }

      datos[campo] = datos[campo].trim();
    }
  }

  if (
    "correo" in datos &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)
  ) {
    return {
      status: 400,
      data: { error: "El correo electrónico no tiene un formato válido." },
    };
  }

  if ("perfil" in datos && datos.perfil !== null) {
    if (typeof datos.perfil !== "string") {
      return {
        status: 400,
        data: { error: "El campo perfil debe ser texto o null." },
      };
    }

    datos.perfil = datos.perfil.trim();
  }

  if ("foto_url" in datos && datos.foto_url !== null) {
    if (typeof datos.foto_url !== "string") {
      return {
        status: 400,
        data: { error: "El campo foto_url debe ser una URL o null." },
      };
    }

    try {
      const url = new URL(datos.foto_url);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Protocolo no permitido");
      }
    } catch {
      return {
        status: 400,
        data: { error: "El campo foto_url debe ser una URL HTTP o HTTPS válida." },
      };
    }
  }

  if ("programa_id" in datos) {
    if (
      !Number.isInteger(datos.programa_id) ||
      datos.programa_id < 1
    ) {
      return {
        status: 400,
        data: { error: "El campo programa_id debe ser un entero positivo." },
      };
    }

    const programa = await pool.query(
      "SELECT id FROM programas WHERE id = $1",
      [datos.programa_id]
    );

    if (programa.rowCount === 0) {
      return {
        status: 400,
        data: { error: "El programa indicado no existe." },
      };
    }
  }

  const valores = [];
  const asignaciones = [];

  for (const campo of campos) {
    valores.push(datos[campo]);
    asignaciones.push(`${campo} = $${valores.length}`);
  }

  valores.push(id);

  const resultado = await pool.query(
    `UPDATE docentes
     SET ${asignaciones.join(", ")}
     WHERE id = $${valores.length}
     RETURNING id`,
    valores
  );

  if (resultado.rowCount === 0) {
    return {
      status: 404,
      data: { error: "No se encontró un docente con ese ID." },
    };
  }

  const docente = await obtenerDocente(id);

  return {
    status: 200,
    data: {
      mensaje: "Docente actualizado correctamente.",
      docente,
    },
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const ruta = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  try {
    if (req.method === "GET" && ruta === "/") {
      return sendJson(res, 200, {
        mensaje: "Microservicio de actualización de docentes funcionando.",
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
            <title>Swagger - Actualización de Docentes</title>
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

    if (req.method === "PUT" && coincidencia) {
      const id = Number(coincidencia[1]);

      if (!Number.isSafeInteger(id) || id < 1) {
        return sendJson(res, 400, {
          error: "El ID debe ser un entero positivo.",
        });
      }

      const datos = await readJsonBody(req);
      const resultado = await actualizarDocente(id, datos);

      return sendJson(res, resultado.status, resultado.data);
    }

    return sendJson(res, 404, { error: "Ruta no encontrada." });
  } catch (error) {
    if (error.status) {
      return sendJson(res, error.status, { error: error.message });
    }

    console.error("Error en el microservicio:", error);

    if (error.code === "23505") {
      return sendJson(res, 409, {
        error: "Ya existe un docente con ese correo electrónico.",
      });
    }

    if (error.code === "23503") {
      return sendJson(res, 400, {
        error: "El programa indicado no existe o está relacionado con otra restricción.",
      });
    }

    return sendJson(res, 500, {
      error: "Ocurrió un error interno al procesar la solicitud.",
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Microservicio de actualización escuchando en el puerto ${PORT}`);
});