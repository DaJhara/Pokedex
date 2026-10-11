import {
    DOCENTES_ACTUALIZACION_API_URL,
    DOCENTES_API_URL,
    DOCENTES_CREACION_API_URL,
    DOCENTES_ELIMINACION_API_URL,
} from "../config/api";

export interface Docente {
  id: number;
  nombres: string;
  apellidos: string;
  facultad: string;
  programa: string;
  programa_id?: number;
  correo: string;
  perfil: string | null;
  foto_url: string | null;
  created_at?: string;
}

export interface Programa {
  id: number;
  nombre: string;
  descripcion: string;
  facultad_id: number;
  facultad: string;
}

export interface Facultad {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface DatosDocente {
  nombres: string;
  apellidos: string;
  correo: string;
  perfil: string | null;
  foto_url: string | null;
  programa_id: number;
}

export type ResultadoEnvio =
  | { estado: "ok"; cuerpo: unknown }
  | { estado: "reintentar"; motivo: string } // sin conexión o servidor caído: se vuelve a intentar luego
  | { estado: "descartar"; motivo: string }; // el servidor rechazó la operación: no tiene sentido reintentar

const TIMEOUT_PING_MS = 6_000;
const TIMEOUT_LECTURA_MS = 20_000;
// Los servicios de Render pueden tardar en "despertar", por eso el tiempo es amplio.
const TIMEOUT_ESCRITURA_MS = 60_000;

async function solicitar(
  url: string,
  init: RequestInit,
  tiempoMaximoMs: number
): Promise<Response> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), tiempoMaximoMs);

  try {
    return await fetch(url, { ...init, signal: controlador.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

// ¿Hay comunicación con los microservicios?
export async function hayComunicacion(): Promise<boolean> {
  try {
    const respuesta = await solicitar(
      `${DOCENTES_API_URL}/health`,
      { method: "GET" },
      TIMEOUT_PING_MS
    );

    return respuesta.ok;
  } catch {
    return false;
  }
}

// ---------- Lectura ----------

async function obtenerJSON<T>(ruta: string): Promise<T> {
  const respuesta = await solicitar(
    `${DOCENTES_API_URL}${ruta}`,
    { headers: { Accept: "application/json" } },
    TIMEOUT_LECTURA_MS
  );

  if (!respuesta.ok) {
    throw new Error(`El servidor respondió con código ${respuesta.status}.`);
  }

  return (await respuesta.json()) as T;
}

export function descargarDocentes(termino?: string): Promise<Docente[]> {
  return obtenerJSON<Docente[]>(
    termino
      ? `/api/docentes?nombre=${encodeURIComponent(termino)}`
      : "/api/docentes"
  );
}

export function descargarProgramas(): Promise<Programa[]> {
  return obtenerJSON<Programa[]>("/api/programas");
}

export function descargarFacultades(): Promise<Facultad[]> {
  return obtenerJSON<Facultad[]>("/api/facultades");
}

// ---------- Escritura ----------

async function enviar(
  url: string,
  metodo: "POST" | "PUT" | "DELETE",
  cuerpo?: DatosDocente,
  toleraNoEncontrado = false
): Promise<ResultadoEnvio> {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (cuerpo) {
    headers["Content-Type"] = "application/json";
  }

  let respuesta: Response;

  try {
    respuesta = await solicitar(
      url,
      {
        method: metodo,
        headers,
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      },
      TIMEOUT_ESCRITURA_MS
    );
  } catch (error) {
    return {
      estado: "reintentar",
      motivo: error instanceof Error ? error.message : "Sin conexión.",
    };
  }

  if (respuesta.ok) {
    let contenido: unknown = null;

    try {
      contenido = await respuesta.json();
    } catch {
      // Respuestas sin cuerpo (por ejemplo 204) son válidas.
    }

    return { estado: "ok", cuerpo: contenido };
  }

  // Eliminar algo que ya no existe en el servidor equivale a haberlo eliminado.
  if (respuesta.status === 404 && toleraNoEncontrado) {
    return { estado: "ok", cuerpo: null };
  }

  const detalle = await respuesta.text().catch(() => "");
  const motivo =
    detalle || `El servidor respondió con código ${respuesta.status}.`;

  const esTransitorio =
    respuesta.status >= 500 ||
    respuesta.status === 408 ||
    respuesta.status === 429;

  return { estado: esTransitorio ? "reintentar" : "descartar", motivo };
}

export function enviarCreacion(datos: DatosDocente): Promise<ResultadoEnvio> {
  return enviar(`${DOCENTES_CREACION_API_URL}/api/docentes`, "POST", datos);
}

export function enviarActualizacion(
  id: number,
  datos: DatosDocente
): Promise<ResultadoEnvio> {
  return enviar(
    `${DOCENTES_ACTUALIZACION_API_URL}/api/docentes/${id}`,
    "PUT",
    datos
  );
}

export function enviarEliminacion(id: number): Promise<ResultadoEnvio> {
  return enviar(
    `${DOCENTES_ELIMINACION_API_URL}/api/docentes/${id}`,
    "DELETE",
    undefined,
    true
  );
}