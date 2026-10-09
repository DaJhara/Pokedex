import Constants from "expo-constants";

const hostUri = Constants.expoConfig?.hostUri;

const host = hostUri?.split(":")[0] || "localhost";

export const API_URL = `https://pokedex-production-82d1.up.railway.app`;