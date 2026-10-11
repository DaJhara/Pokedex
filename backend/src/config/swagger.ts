import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",

  info: {
    title: "Pokémon API",
    version: "1.0.0",
    description:
      "Microservicio Node.js para consultar Pokémon almacenados en PostgreSQL.",
  },

  servers: [
    {
      url: "/",
      description: "Servidor actual",
    },
  ],

  tags: [
    {
      name: "Pokémon",
      description: "Operaciones relacionadas con Pokémon",
    },
  ],

  paths: {
    "/api/pokemon/{nombre}": {
      get: {
        summary: "Buscar un Pokémon",
        description:
          "Busca un Pokémon por su nombre o por su ID.",
        tags: ["Pokémon"],

        parameters: [
          {
            name: "nombre",
            in: "path",
            required: true,
            description:
              "Nombre o ID del Pokémon que deseas consultar.",
            schema: {
              type: "string",
            },
            example: "pikachu",
          },
        ],

        responses: {
          "200": {
            description: "Pokémon encontrado correctamente.",
          },

          "404": {
            description: "Pokémon no encontrado.",
          },

          "400": {
            description:
              "No se proporcionó un nombre válido.",
          },
        },
      },
    },
  },

  components: {
    schemas: {
      Pokemon: {
        type: "object",

        properties: {
          id: {
            type: "integer",
            example: 25,
          },

          name: {
            type: "string",
            example: "pikachu",
          },

          height: {
            type: "integer",
            example: 4,
          },

          weight: {
            type: "integer",
            example: 60,
          },

          sprites: {
            type: "object",

            properties: {
              front_default: {
                type: "string",
                nullable: true,
                example:
                  "https://example.com/pikachu.png",
              },

              front_female: {
                type: "string",
                nullable: true,
              },

              front_shiny: {
                type: "string",
                nullable: true,
              },

              front_shiny_female: {
                type: "string",
                nullable: true,
              },
            },
          },

          stats: {
            type: "array",

            items: {
              type: "object",

              properties: {
                base_stat: {
                  type: "integer",
                  example: 35,
                },

                stat: {
                  type: "object",

                  properties: {
                    name: {
                      type: "string",
                      example: "hp",
                    },
                  },
                },
              },
            },
          },

          moves: {
            type: "array",

            items: {
              type: "object",

              properties: {
                move: {
                  type: "object",

                  properties: {
                    name: {
                      type: "string",
                      example: "thunder-shock",
                    },
                  },
                },
              },
            },
          },

          species: {
            type: "object",

            properties: {
              name: {
                type: "string",
                example: "pikachu",
              },

              url: {
                type: "string",
                example:
                  "https://pokeapi.co/api/v2/pokemon-species/25/",
              },
            },
          },
        },
      },
    },
  },
};

export const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: [],
});