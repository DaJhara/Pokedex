import Constants from "expo-constants";

const hostUri = Constants.expoConfig?.hostUri;

const host = hostUri?.split(":")[0] || "localhost";

export const API_URL = `http://${host}:3000`;