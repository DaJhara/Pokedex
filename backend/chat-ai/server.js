
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "20kb" }));

// Proveedores de IA
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/free";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// Microservicios existentes
const POKEMON_API_URL = process.env.POKEMON_API_URL;
const ONEPIECE_API_URL = process.env.ONEPIECE_API_URL;

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

const TIEMPOS_PERMITIDOS = [20, 40, 80, 160];
const PROVEEDORES_PERMITIDOS = ["gemini", "openrouter", "groq"];

function normalizar(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function obtenerBase(tipo) {
  const base =
    tipo === "pokemon"
      ? POKEMON_API_URL
      : ONEPIECE_API_URL;

  if (!base) {
    throw new Error(`Falta configurar la URL de ${tipo}.`);
  }

  return base.replace(/\/+$/, "");
}

async function obtenerCatalogo(tipo) {
  const clave = `catalogo:${tipo}`;
  const existente = cache.get(clave);

  if (existente && Date.now() - existente.fecha < CACHE_MS) {
    return existente.datos;
  }

  const recurso = tipo === "pokemon" ? "pokemon" : "onepiece";
  const url = `${obtenerBase(tipo)}/api/${recurso}/catalogo`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener el catálogo de ${tipo} (HTTP ${response.status}).`
    );
  }

  const datos = await response.json();

  if (!Array.isArray(datos)) {
    throw new Error(`El catálogo de ${tipo} no devolvió una lista.`);
  }

  const catalogo = datos
    .map((item) => {
      const nombre = item.name ?? item.nombre;

      if (typeof nombre !== "string" || !nombre.trim()) {
        return null;
      }

      return {
        nombre: nombre.trim(),
        normalizado: normalizar(nombre),
      };
    })
    .filter(Boolean);

  cache.set(clave, {
    fecha: Date.now(),
    datos: catalogo,
  });

  return catalogo;
}

// Se conserva la validación actual de personajes.
function detectarEntidades(pregunta, catalogo) {
  const palabrasPregunta = new Set(normalizar(pregunta).split(" "));

  return catalogo.filter((item) => {
    const palabrasNombre = item.normalizado
      .split(" ")
      .filter((palabra) => palabra.length >= 3);

    return palabrasNombre.some((palabra) =>
      palabrasPregunta.has(palabra)
    );
  });
}

async function validarPersonajes(pregunta) {
  const [resultadoPokemon, resultadoOnePiece] =
    await Promise.allSettled([
      obtenerCatalogo("pokemon"),
      obtenerCatalogo("onepiece"),
    ]);

  const errores = [];

  const pokemonCatalogo =
    resultadoPokemon.status === "fulfilled"
      ? resultadoPokemon.value
      : [];

  const onepieceCatalogo =
    resultadoOnePiece.status === "fulfilled"
      ? resultadoOnePiece.value
      : [];

  if (resultadoPokemon.status === "rejected") {
    errores.push(
      resultadoPokemon.reason?.message ||
        "Error obteniendo el catálogo Pokémon."
    );
  }

  if (resultadoOnePiece.status === "rejected") {
    errores.push(
      resultadoOnePiece.reason?.message ||
        "Error obteniendo el catálogo One Piece."
    );
  }

  if (
    resultadoPokemon.status === "rejected" &&
    resultadoOnePiece.status === "rejected"
  ) {
    return {
      entidades: [],
      errores,
      catalogosDisponibles: false,
    };
  }

  const pokemonDetectados = detectarEntidades(
    pregunta,
    pokemonCatalogo
  ).map((item) => ({
    tipo: "pokemon",
    nombre: item.nombre,
  }));

  const onepieceDetectados = detectarEntidades(
    pregunta,
    onepieceCatalogo
  ).map((item) => ({
    tipo: "onepiece",
    nombre: item.nombre,
  }));

  return {
    entidades: [...pokemonDetectados, ...onepieceDetectados],
    errores,
    catalogosDisponibles: true,
  };
}

const INSTRUCCIONES_IA = `
Eres un asistente especializado en Pokémon y One Piece.
Responde en español y de forma clara.

Devuelve exclusivamente un objeto JSON válido con esta estructura:
{
  "respuesta": "Respuesta para el usuario",
  "entidades": [
    {
      "tipo": "pokemon",
      "nombre": "Nombre del personaje",
      "datoClave": "Dato relevante"
    }
  ]
}

Reglas:
- "respuesta" debe ser una cadena de texto.
- "entidades" debe ser un arreglo.
- Cada entidad debe contener "tipo", "nombre" y "datoClave".
- "tipo" solo puede ser "pokemon" u "onepiece".
- Si no hay personajes adicionales que mencionar, usa un arreglo vacío.
- No incluyas Markdown ni texto fuera del JSON.
`.trim();

function crearError(mensaje, status = 502) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarResultado(resultado, proveedor) {
  if (
    !resultado ||
    typeof resultado.respuesta !== "string" ||
    !Array.isArray(resultado.entidades) ||
    !resultado.entidades.every(
      (entidad) =>
        entidad &&
        ["pokemon", "onepiece"].includes(entidad.tipo) &&
        typeof entidad.nombre === "string" &&
        typeof entidad.datoClave === "string"
    )
  ) {
    throw crearError(
      `${proveedor} devolvió una respuesta con estructura inválida.`
    );
  }

  return resultado;
}

function extraerJson(texto, proveedor) {
  if (typeof texto !== "string" || !texto.trim()) {
    throw crearError(`${proveedor} no devolvió contenido.`);
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw crearError(
      `${proveedor} devolvió una respuesta que no es JSON válido.`
    );
  }
}

async function leerRespuesta(response, proveedor) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(
      `Error de ${proveedor}:`,
      response.status,
      JSON.stringify(data).slice(0, 1000)
    );

    if (response.status === 429) {
      throw crearError(
        `Se alcanzó el límite de solicitudes de ${proveedor}.`,
        429
      );
    }

    throw crearError(
      `El proveedor ${proveedor} no pudo procesar la pregunta.`
    );
  }

  return data;
}

async function llamarGemini(pregunta, tiempoEspera) {
  if (!GEMINI_API_KEY) {
    throw crearError("Falta configurar GEMINI_API_KEY.", 500);
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(GEMINI_MODEL)}:generateContent` +
    `?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: INSTRUCCIONES_IA }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: pregunta }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(tiempoEspera * 1000),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw crearError(
        `Gemini superó el tiempo de espera de ${tiempoEspera} segundos.`,
        504
      );
    }
    throw error;
  }

  const data = await leerRespuesta(response, "Gemini");
  const texto = data.candidates?.[0]?.content?.parts
    ?.map((parte) => parte.text || "")
    .join("");

  return validarResultado(
    extraerJson(texto, "Gemini"),
    "Gemini"
  );
}

async function llamarOpenRouter(pregunta, tiempoEspera) {
  if (!OPENROUTER_API_KEY) {
    throw crearError("Falta configurar OPENROUTER_API_KEY.", 500);
  }

  let response;

  try {
    response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: "system",
              content: INSTRUCCIONES_IA,
            },
            {
              role: "user",
              content: pregunta,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }),
        signal: AbortSignal.timeout(tiempoEspera * 1000),
      }
    );
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw crearError(
        `OpenRouter superó el tiempo de espera de ${tiempoEspera} segundos.`,
        504
      );
    }
    throw error;
  }

  const data = await leerRespuesta(response, "OpenRouter");
  const texto = data.choices?.[0]?.message?.content;

  return validarResultado(
    extraerJson(texto, "OpenRouter"),
    "OpenRouter"
  );
}

async function llamarGroq(pregunta, tiempoEspera) {
  if (!GROQ_API_KEY) {
    throw crearError("Falta configurar GROQ_API_KEY.", 500);
  }

  let response;

  try {
    response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content: INSTRUCCIONES_IA,
            },
            {
              role: "user",
              content: pregunta,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }),
        signal: AbortSignal.timeout(tiempoEspera * 1000),
      }
    );
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw crearError(
        `Groq superó el tiempo de espera de ${tiempoEspera} segundos.`,
        504
      );
    }
    throw error;
  }

  const data = await leerRespuesta(response, "Groq");
  const texto = data.choices?.[0]?.message?.content;

  return validarResultado(
    extraerJson(texto, "Groq"),
    "Groq"
  );
}

async function generarRespuestaIA({
  pregunta,
  proveedor,
  tiempoEspera,
}) {
  switch (proveedor) {
    case "gemini":
      return llamarGemini(pregunta, tiempoEspera);

    case "openrouter":
      return llamarOpenRouter(pregunta, tiempoEspera);

    case "groq":
      return llamarGroq(pregunta, tiempoEspera);

    default:
      throw crearError("Proveedor de IA no válido.", 400);
  }
}

const swagger = {
  openapi: "3.0.0",
  info: {
    title: "Pokedex Chat IA",
    version: "1.1.0",
    description:
      "Chat con validación de personajes y proveedor de IA configurable.",
  },
  paths: {
    "/": {
      get: {
        summary: "Estado del servicio",
        responses: {
          200: { description: "Servicio disponible" },
        },
      },
    },
    "/api/chat": {
      post: {
        summary: "Enviar pregunta al chat",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["pregunta"],
                properties: {
                  pregunta: { type: "string" },
                  proveedor: {
                    type: "string",
                    enum: PROVEEDORES_PERMITIDOS,
                    default: "openrouter",
                  },
                  tiempoEspera: {
                    type: "integer",
                    enum: TIEMPOS_PERMITIDOS,
                    default: 40,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Respuesta generada correctamente" },
          400: { description: "Parámetros inválidos" },
          404: { description: "No se encontró un personaje autorizado" },
          429: { description: "Límite del proveedor alcanzado" },
          502: { description: "Error del proveedor o de un servicio externo" },
          504: { description: "Tiempo de espera agotado" },
        },
      },
    },
  },
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swagger));

app.get("/", (_req, res) => {
  res.json({
    servicio: "Pokedex Chat IA",
    estado: "funcionando",
    proveedores: PROVEEDORES_PERMITIDOS,
    tiemposEspera: TIEMPOS_PERMITIDOS,
    documentacion: "/docs",
  });
});

app.get("/api/configuracion", (_req, res) => {
  res.json({
    proveedores: PROVEEDORES_PERMITIDOS,
    tiemposEspera: TIEMPOS_PERMITIDOS,
    proveedorPredeterminado: "openrouter",
    tiempoPredeterminado: 40,
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const pregunta =
      typeof req.body?.pregunta === "string"
        ? req.body.pregunta.trim()
        : "";

    const proveedor = req.body?.proveedor || "openrouter";
    const tiempoEspera = Number(req.body?.tiempoEspera ?? 40);

    if (!pregunta) {
      return res.status(400).json({
        error: "Debes escribir una pregunta.",
      });
    }

    if (pregunta.length > 1000) {
      return res.status(400).json({
        error: "La pregunta no puede superar 1000 caracteres.",
      });
    }

    if (!PROVEEDORES_PERMITIDOS.includes(proveedor)) {
      return res.status(400).json({
        error: "Proveedor inválido. Usa gemini, openrouter o groq.",
      });
    }

    if (!TIEMPOS_PERMITIDOS.includes(tiempoEspera)) {
      return res.status(400).json({
        error: "El tiempo debe ser 20, 40, 80 o 160 segundos.",
      });
    }

    const {
      entidades,
      errores,
      catalogosDisponibles,
    } = await validarPersonajes(pregunta);

    if (!catalogosDisponibles) {
      return res.status(502).json({
        error: "No se pudieron verificar los personajes registrados.",
        detalles: errores,
      });
    }

    if (entidades.length === 0) {
      const huboError = errores.length > 0;

      return res.status(huboError ? 502 : 404).json({
        error: huboError
          ? "No se pudo verificar el personaje. Revisa la conexión con los microservicios."
          : "No se encontró ningún personaje de esta pregunta en las bases de datos de la aplicación.",
        detalles: errores,
      });
    }

    const respuesta = await generarRespuestaIA({
      pregunta,
      proveedor,
      tiempoEspera,
    });

    return res.json({
      pregunta,
      respuesta,
      contextoConsultado: entidades.map((item) => ({
        tipo: item.tipo,
        nombre: item.nombre,
      })),
      advertencias: errores.length
        ? ["No se pudieron consultar algunos catálogos."]
        : [],
      llamadasIA: 1,
      proveedor,
      tiempoEspera,
    });
  } catch (error) {
    console.error("Error en /api/chat:", error);

    const status = [400, 429, 500, 502, 504].includes(error.status)
      ? error.status
      : 500;

    return res.status(status).json({
      error: error.message || "No fue posible procesar la pregunta.",
      detalle:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Chat IA ejecutándose en el puerto ${PORT}`);
});
