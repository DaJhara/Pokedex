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
        },
      },
    },
  },
};

export const swaggerSpec =
  swaggerJSDoc({
    definition: swaggerDefinition,

    apis: [
      "./src/routes/*.ts",
    ],
  });