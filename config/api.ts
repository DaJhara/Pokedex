import Constants from "expo-constants";

const hostUri = Constants.expoConfig?.hostUri;
const host = hostUri?.split(":")[0] || "localhost";

export const API_URL =
  "https://pokedex-production-82d1.up.railway.app";

export const DOCENTES_API_URL =
  "https://microdoncentes-production.up.railway.app";

export const DOCENTES_CREACION_API_URL =
  "https://docentes-creacion.onrender.com";

export const DOCENTES_ACTUALIZACION_API_URL =
  "https://docentes-actualizacion.onrender.com";

export const DOCENTES_ELIMINACION_API_URL =
  "https://docentes-eliminacion.onrender.com";
