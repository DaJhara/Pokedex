import type { SQLiteDatabase } from "expo-sqlite";
import { AppState } from "react-native";

import {
  bdDisponible,
  ejecutarEnBD,
  guardarMeta,
  leerMeta,
} from "../database/docentesDb";
import * as api from "./docentesApi";

const INTERVALO_SYNC_MS = 5_000; // cada cuánto se comprueba la conexión
const VIGENCIA_ESPEJO_MS = 30_000; // cada cuánto se refresca el espejo completo

export type TipoOperacion = "CREAR" | "ACTUALIZAR" | "ELIMINAR";

interface OperacionCola {
  id: number;
  operacion: TipoOperacion;
  docente_id: number;
  payload: string | null;
  intentos: number;
}

// ---------- Avisos a la interfaz ----------

const escuchadores = new Set<() => void>();

// La pantalla se suscribe para refrescar la lista cuando termina una sincronización.
export function suscribirseASincronizacion(escuchador: () => void): () => void {
  escuchadores.add(escuchador);

  return () => {
    escuchadores.delete(escuchador);
  };
}

function notificar() {
  escuchadores.forEach((escuchador) => {
    try {
      escuchador();
    } catch {
      // Un escuchador con error no debe detener la sincronización.
    }
  });
}

// ---------- Utilidades ----------

export function contarOperacionesPendientes(): Promise<number> {
  return ejecutarEnBD(async (db) => {
    const fila = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM cola_sync"
    );

    return fila?.n ?? 0;
  });
}

export function ultimaDescarga(): Promise<number> {
  return ejecutarEnBD(async (db) =>
    Number(await leerMeta(db, "ultima_descarga")) || 0
  );
}

const clavePrograma = (facultad: string, programa: string) =>
  `${facultad.trim().toLowerCase()}|${programa.trim().toLowerCase()}`;

// ---------- Envío de operaciones pendientes (local → microservicios) ----------

function enviarOperacion(op: OperacionCola): Promise<api.ResultadoEnvio> {
  const datos = op.payload ? (JSON.parse(op.payload) as api.DatosDocente) : null;

  if (op.operacion === "CREAR" && datos) {
    return api.enviarCreacion(datos);
  }

  // Un ID negativo aquí significa que su creación fue rechazada: no hay a qué aplicar el cambio.
  if (op.docente_id < 0) {
    return Promise.resolve({
      estado: "descartar",
      motivo: "El docente nunca llegó a crearse en el servidor.",
    });
  }

  if (op.operacion === "ACTUALIZAR" && datos) {
    return api.enviarActualizacion(op.docente_id, datos);
  }

  if (op.operacion === "ELIMINAR") {
    return api.enviarEliminacion(op.docente_id);
  }

  return Promise.resolve({
    estado: "descartar",
    motivo: "Operación desconocida o sin datos.",
  });
}

async function aplicarResultado(
  db: SQLiteDatabase,
  op: OperacionCola,
  resultado: api.ResultadoEnvio
): Promise<void> {
  if (resultado.estado === "ok" && op.operacion === "CREAR") {
    const idRemoto = Number((resultado.cuerpo as { id?: unknown } | null)?.id);

    if (Number.isInteger(idRemoto) && idRemoto > 0) {
      // El docente temporal (ID negativo) pasa a tener el ID real del servidor,
      // y las operaciones pendientes sobre él se redirigen al ID real.
      await db.runAsync("DELETE FROM docentes WHERE id = ?", idRemoto);
      await db.runAsync(
        "UPDATE docentes SET id = ? WHERE id = ?",
        idRemoto,
        op.docente_id
      );
      await db.runAsync(
        "UPDATE cola_sync SET docente_id = ? WHERE docente_id = ?",
        idRemoto,
        op.docente_id
      );
      await db.runAsync(
        "INSERT OR REPLACE INTO mapa_ids (local_id, remote_id) VALUES (?, ?)",
        op.docente_id,
        idRemoto
      );
    }
  }

  if (resultado.estado === "descartar") {
    console.warn(
      `[sync docentes] ${op.operacion} #${op.docente_id} rechazada por el servidor: ${resultado.motivo}`
    );

    // Si no se pudo crear, se eliminan también los cambios encadenados sobre ese docente.
    // El siguiente refresco del espejo deja la base local igual a la del servidor.
    if (op.operacion === "CREAR") {
      await db.runAsync(
        "DELETE FROM cola_sync WHERE docente_id = ? AND id <> ?",
        op.docente_id,
        op.id
      );
      await db.runAsync("DELETE FROM docentes WHERE id = ?", op.docente_id);
    }
  }

  await db.runAsync("DELETE FROM cola_sync WHERE id = ?", op.id);
}

// Devuelve true si se envió al menos una operación.
async function enviarPendientes(): Promise<boolean> {
  let huboEnvios = false;

  try {
    for (;;) {
      // Siempre en orden: una operación puede depender de la anterior.
      const op = await ejecutarEnBD((db) =>
        db.getFirstAsync<OperacionCola>(
          "SELECT * FROM cola_sync ORDER BY id LIMIT 1"
        )
      );

      if (!op) {
        break;
      }

      // La petición de red se hace FUERA de la cola de la base de datos.
      const resultado = await enviarOperacion(op);

      if (resultado.estado === "reintentar") {
        await ejecutarEnBD((db) =>
          db.runAsync(
            "UPDATE cola_sync SET intentos = intentos + 1, ultimo_error = ? WHERE id = ?",
            resultado.motivo,
            op.id
          )
        );
        break;
      }

      await ejecutarEnBD((db) => aplicarResultado(db, op, resultado), true);
      huboEnvios = true;
    }
  } catch (error) {
    console.warn("[sync docentes] Error enviando operaciones pendientes:", error);
  }

  return huboEnvios;
}

// ---------- Descarga del espejo completo (microservicios → local) ----------

async function descargarEspejo(): Promise<void> {
  const [facultades, programas, docentes] = await Promise.all([
    api.descargarFacultades(),
    api.descargarProgramas(),
    api.descargarDocentes(),
  ]);

  // El endpoint de docentes devuelve nombres de programa/facultad; se obtiene el programa_id con ellos.
  const idsProgramas = new Map<string, number>();

  programas.forEach((programa) => {
    idsProgramas.set(clavePrograma(programa.facultad, programa.nombre), programa.id);
  });

  await ejecutarEnBD(async (db) => {
    await db.runAsync("DELETE FROM facultades");
    await db.runAsync("DELETE FROM programas");

    for (const facultad of facultades) {
      await db.runAsync(
        "INSERT INTO facultades (id, nombre, descripcion) VALUES (?, ?, ?)",
        facultad.id,
        facultad.nombre,
        facultad.descripcion ?? null
      );
    }

    for (const programa of programas) {
      await db.runAsync(
        "INSERT INTO programas (id, nombre, descripcion, facultad_id) VALUES (?, ?, ?, ?)",
        programa.id,
        programa.nombre,
        programa.descripcion ?? null,
        programa.facultad_id
      );
    }

    // Si el usuario hizo cambios mientras se descargaba, NO se sobrescriben los docentes locales.
    const fila = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM cola_sync"
    );

    if ((fila?.n ?? 0) > 0) {
      return;
    }

    await db.runAsync("DELETE FROM docentes");

    for (const docente of docentes) {
      const programaId =
        docente.programa_id ??
        idsProgramas.get(clavePrograma(docente.facultad, docente.programa));

      if (!programaId) {
        console.warn(
          `[sync docentes] No se pudo determinar el programa del docente #${docente.id}.`
        );
        continue;
      }

      await db.runAsync(
        `INSERT INTO docentes
          (id, nombres, apellidos, correo, perfil, foto_url, programa_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        docente.id,
        docente.nombres,
        docente.apellidos,
        docente.correo,
        docente.perfil ?? null,
        docente.foto_url ?? null,
        programaId,
        docente.created_at ?? null
      );
    }

    await guardarMeta(db, "ultima_descarga", String(Date.now()));
  }, true);
}

// ---------- Orquestación ----------

// Devuelve true si todo quedó sincronizado (sin operaciones pendientes).
async function ejecutarSincronizacion(): Promise<boolean> {
  if (!(await bdDisponible())) {
    return false;
  }

  if (!(await api.hayComunicacion())) {
    return false;
  }

  const huboEnvios = await enviarPendientes();
  const pendientes = await contarOperacionesPendientes();
  let huboDescarga = false;

  if (pendientes === 0) {
    const vencido = Date.now() - (await ultimaDescarga()) > VIGENCIA_ESPEJO_MS;

    if (huboEnvios || vencido) {
      try {
        await descargarEspejo();
        huboDescarga = true;
      } catch (error) {
        console.warn("[sync docentes] Error descargando el espejo:", error);
      }
    }
  }

  if (huboEnvios || huboDescarga) {
    notificar();
  }

  return pendientes === 0;
}

let enCurso: Promise<boolean> | null = null;
let repetir = false;

/**
 * Sincroniza: envía lo pendiente y refresca el espejo local.
 * Si ya hay una sincronización en marcha no lanza otra en paralelo,
 * pero programa una repetición para no perder los cambios más recientes.
 */
export function sincronizarDocentes(): Promise<boolean> {
  if (enCurso) {
    repetir = true;
    return enCurso;
  }

  enCurso = (async () => {
    let completo = false;

    do {
      repetir = false;

      try {
        completo = await ejecutarSincronizacion();
      } catch (error) {
        console.warn("[sync docentes] Error de sincronización:", error);
        completo = false;
      }
    } while (repetir);

    return completo;
  })().finally(() => {
    enCurso = null;
  });

  return enCurso;
}

/**
 * Arranca la detección de conexión: sincroniza al iniciar, al volver a primer plano
 * y periódicamente (así se detecta cuándo regresa la comunicación con los microservicios).
 * Devuelve la función para detenerla.
 */
export function iniciarSincronizacionDocentes(): () => void {
  void sincronizarDocentes();

  const temporizador = setInterval(() => {
    void sincronizarDocentes();
  }, INTERVALO_SYNC_MS);

  const suscripcion = AppState.addEventListener("change", (estado) => {
    if (estado === "active") {
      void sincronizarDocentes();
    }
  });

  return () => {
    clearInterval(temporizador);
    suscripcion.remove();
  };
}