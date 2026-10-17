import type { SQLiteDatabase } from "expo-sqlite";
import { AppState } from "react-native";

import {
  bdDisponible,
  ejecutarEnBD,
  guardarMeta,
  leerMeta,
} from "../database/docentesDb";
import * as api from "./docentesApi";

// ---------- Configuración ----------

// Opciones que el usuario puede elegir para revisar la nube.
export const INTERVALOS_DISPONIBLES_MS: readonly number[] = [
  2_000,
  10_000,
  30_000,
];

const INTERVALO_POR_DEFECTO_MS = 10_000;
const VIGENCIA_REFERENCIA_MS = 30_000; // facultades y programas cambian poco

export type TipoOperacion = "CREAR" | "ACTUALIZAR" | "ELIMINAR";
export type TipoConflicto = "DUPLICADO" | "CONFLICTO" | "RECHAZADA";

interface OperacionCola {
  id: number;
  operacion: TipoOperacion;
  docente_id: number;
  payload: string | null;
  intentos: number;
}

export interface AvisoConflicto {
  id: number;
  tipo: TipoConflicto;
  mensaje: string;
}

// Lo que la interfaz necesita para mostrar el estado de la sincronización.
export interface EstadoSincronizacion {
  sqlite: boolean; // false: modo solo en línea (sin respaldo local)
  enLinea: boolean | null; // null: aún no se ha comprobado
  pendientes: number; // operaciones locales sin enviar
  nuevos: number; // docentes nuevos en la nube que aún no se han visto
  nombresNuevos: string[];
  conflictos: AvisoConflicto[]; // avisos de duplicados/rechazos sin leer
  intervaloMs: number;
  ultimaRevision: number | null;
}

// ---------- Avisos a la interfaz ----------

const escuchadores = new Set<() => void>();
const escuchadoresEstado = new Set<(estado: EstadoSincronizacion) => void>();

// La pantalla se suscribe para refrescar la lista cuando cambian los datos locales.
export function suscribirseASincronizacion(escuchador: () => void): () => void {
  escuchadores.add(escuchador);

  return () => {
    escuchadores.delete(escuchador);
  };
}

export function notificarCambioDatos() {
  escuchadores.forEach((escuchador) => {
    try {
      escuchador();
    } catch {
      // Un escuchador con error no debe detener la sincronización.
    }
  });
}

let estadoActual: EstadoSincronizacion = {
  sqlite: true,
  enLinea: null,
  pendientes: 0,
  nuevos: 0,
  nombresNuevos: [],
  conflictos: [],
  intervaloMs: INTERVALO_POR_DEFECTO_MS,
  ultimaRevision: null,
};

export function obtenerEstado(): EstadoSincronizacion {
  return estadoActual;
}

export function suscribirseAEstado(
  escuchador: (estado: EstadoSincronizacion) => void
): () => void {
  escuchadoresEstado.add(escuchador);

  return () => {
    escuchadoresEstado.delete(escuchador);
  };
}

function fijarEstado(parcial: Partial<EstadoSincronizacion>) {
  const siguiente = { ...estadoActual, ...parcial };

  if (JSON.stringify(siguiente) === JSON.stringify(estadoActual)) {
    return;
  }

  estadoActual = siguiente;

  escuchadoresEstado.forEach((escuchador) => {
    try {
      escuchador(estadoActual);
    } catch {
      // ignorar
    }
  });
}

// Lee de SQLite los contadores y avisos que muestra el panel.
export async function refrescarEstado(): Promise<void> {
  if (!(await bdDisponible())) {
    fijarEstado({ sqlite: false });
    return;
  }

  try {
    const datos = await ejecutarEnBD(async (db) => {
      const pendientes =
        (
          await db.getFirstAsync<{ n: number }>(
            "SELECT COUNT(*) AS n FROM cola_sync"
          )
        )?.n ?? 0;

      const nuevos = await db.getAllAsync<{
        nombres: string;
        apellidos: string;
      }>(
        "SELECT nombres, apellidos FROM docentes WHERE nuevo = 1 ORDER BY id DESC"
      );

      const conflictos = await db.getAllAsync<AvisoConflicto>(
        "SELECT id, tipo, mensaje FROM conflictos WHERE visto = 0 ORDER BY id DESC LIMIT 5"
      );

      return { pendientes, nuevos, conflictos };
    });

    fijarEstado({
      sqlite: true,
      pendientes: datos.pendientes,
      nuevos: datos.nuevos.length,
      nombresNuevos: datos.nuevos
        .slice(0, 5)
        .map((docente) => `${docente.nombres} ${docente.apellidos}`),
      conflictos: datos.conflictos,
    });
  } catch (error) {
    console.warn("[sync docentes] No se pudo refrescar el estado:", error);
  }
}

// ---------- Indicadores "nuevo" y avisos ----------

export async function marcarDocenteVisto(id: number): Promise<void> {
  if (!(await bdDisponible())) return;

  await ejecutarEnBD((db) =>
    db.runAsync("UPDATE docentes SET nuevo = 0 WHERE id = ? AND nuevo = 1", id)
  );

  await refrescarEstado();
  notificarCambioDatos();
}

export async function marcarTodosVistos(): Promise<void> {
  if (!(await bdDisponible())) return;

  await ejecutarEnBD((db) =>
    db.runAsync("UPDATE docentes SET nuevo = 0 WHERE nuevo = 1")
  );

  await refrescarEstado();
  notificarCambioDatos();
}

export async function descartarAvisosConflictos(): Promise<void> {
  if (!(await bdDisponible())) return;

  await ejecutarEnBD((db) =>
    db.runAsync("UPDATE conflictos SET visto = 1 WHERE visto = 0")
  );

  await refrescarEstado();
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
  return ejecutarEnBD(
    async (db) => Number(await leerMeta(db, "ultima_descarga")) || 0
  );
}

function ultimaReferencia(): Promise<number> {
  return ejecutarEnBD(
    async (db) => Number(await leerMeta(db, "ultima_referencia")) || 0
  );
}

const normalizar = (texto: string | null | undefined) =>
  (texto ?? "").trim().toLowerCase();

const clavePrograma = (facultad: string, programa: string) =>
  `${normalizar(facultad)}|${normalizar(programa)}`;

// ---------- Resolución de conflictos ----------

async function registrarConflicto(
  db: SQLiteDatabase,
  tipo: TipoConflicto,
  correo: string | null,
  mensaje: string,
  local: unknown,
  remoto: unknown
): Promise<void> {
  await db.runAsync(
    `INSERT INTO conflictos (tipo, correo, mensaje, local_json, remoto_json, creado_en)
     VALUES (?, ?, ?, ?, ?, ?)`,
    tipo,
    correo,
    mensaje,
    JSON.stringify(local ?? null),
    JSON.stringify(remoto ?? null),
    new Date().toISOString()
  );
}

// El docente temporal (ID negativo) pasa a tener el ID real del servidor,
// y las operaciones pendientes sobre él se redirigen al ID real.
async function remapearId(
  db: SQLiteDatabase,
  idLocal: number,
  idRemoto: number
): Promise<void> {
  await db.runAsync("DELETE FROM docentes WHERE id = ?", idRemoto);
  await db.runAsync(
    "UPDATE docentes SET id = ? WHERE id = ?",
    idRemoto,
    idLocal
  );
  await db.runAsync(
    "UPDATE cola_sync SET docente_id = ? WHERE docente_id = ?",
    idRemoto,
    idLocal
  );
  await db.runAsync(
    "INSERT OR REPLACE INTO mapa_ids (local_id, remote_id) VALUES (?, ?)",
    idLocal,
    idRemoto
  );
}

// Elimina un docente que nunca llegó a crearse, junto con los cambios encadenados sobre él.
async function descartarCreacion(
  db: SQLiteDatabase,
  op: OperacionCola
): Promise<void> {
  await db.runAsync(
    "DELETE FROM cola_sync WHERE docente_id = ? AND id <> ?",
    op.docente_id,
    op.id
  );
  await db.runAsync("DELETE FROM docentes WHERE id = ?", op.docente_id);
}

/**
 * Un docente creado sin conexión ya existe en la nube (mismo correo).
 *
 * Regla: el correo es la clave natural (es único en la nube), por lo que NUNCA
 * se crean dos registros, y la nube es la fuente de verdad:
 *  - Misma información  -> DUPLICADO: se conserva un solo registro y el local se
 *    vincula al de la nube (los cambios posteriores hechos offline se aplican a él).
 *  - Información distinta -> CONFLICTO: prevalece la nube. La versión local se
 *    descarta pero queda guardada en la tabla "conflictos" y se avisa al usuario.
 */
async function resolverDuplicado(
  db: SQLiteDatabase,
  op: OperacionCola,
  remoto: api.Docente
): Promise<void> {
  const datos = JSON.parse(op.payload ?? "{}") as api.DatosDocente;

  const programa = await db.getFirstAsync<{
    programa: string;
    facultad: string;
  }>(
    `SELECT p.nombre AS programa, f.nombre AS facultad
     FROM programas p JOIN facultades f ON f.id = p.facultad_id
     WHERE p.id = ?`,
    datos.programa_id
  );

  const mismoPrograma =
    remoto.programa_id != null
      ? remoto.programa_id === datos.programa_id
      : Boolean(programa) &&
        normalizar(programa?.programa) === normalizar(remoto.programa) &&
        normalizar(programa?.facultad) === normalizar(remoto.facultad);

  const mismaInformacion =
    normalizar(remoto.nombres) === normalizar(datos.nombres) &&
    normalizar(remoto.apellidos) === normalizar(datos.apellidos) &&
    normalizar(remoto.perfil) === normalizar(datos.perfil) &&
    normalizar(remoto.foto_url) === normalizar(datos.foto_url) &&
    mismoPrograma;

  const nombre = `${datos.nombres} ${datos.apellidos}`.trim();

  if (mismaInformacion) {
    await remapearId(db, op.docente_id, remoto.id);

    await db.runAsync(
      "UPDATE docentes SET created_at = COALESCE(?, created_at) WHERE id = ?",
      remoto.created_at ?? null,
      remoto.id
    );

    await registrarConflicto(
      db,
      "DUPLICADO",
      datos.correo,
      `“${nombre}” (${datos.correo}) ya existía en la nube con la misma información. Se conservó un solo registro.`,
      datos,
      remoto
    );
  } else {
    await descartarCreacion(db, op);

    console.warn(
      `[sync docentes] Conflicto con ${datos.correo}: prevalece la versión de la nube.`
    );

    await registrarConflicto(
      db,
      "CONFLICTO",
      datos.correo,
      `El correo ${datos.correo} ya existía en la nube con datos distintos a los que registraste sin conexión (${nombre}). Prevaleció la información de la nube.`,
      datos,
      remoto
    );
  }

  await db.runAsync("DELETE FROM cola_sync WHERE id = ?", op.id);
}

// ---------- Envío de operaciones pendientes (local → microservicios) ----------

function enviarOperacion(
  op: OperacionCola,
  datos: api.DatosDocente | null
): Promise<api.ResultadoEnvio> {
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
      await remapearId(db, op.docente_id, idRemoto);
    }
  }

  if (resultado.estado === "descartar") {
    const datos = op.payload
      ? (JSON.parse(op.payload) as api.DatosDocente)
      : null;

    const accion = {
      CREAR: "crear",
      ACTUALIZAR: "actualizar",
      ELIMINAR: "eliminar",
    }[op.operacion];

    const quien = datos
      ? `a ${datos.nombres} ${datos.apellidos}`
      : `al docente #${op.docente_id}`;

    console.warn(
      `[sync docentes] ${op.operacion} #${op.docente_id} rechazada por el servidor: ${resultado.motivo}`
    );

    await registrarConflicto(
      db,
      "RECHAZADA",
      datos?.correo ?? null,
      `El servidor rechazó ${accion} ${quien}: ${resultado.motivo} Se conservó la versión de la nube.`,
      datos,
      null
    );

    // Si no se pudo crear, se eliminan también los cambios encadenados sobre ese docente.
    // El siguiente refresco deja la base local igual a la de la nube.
    if (op.operacion === "CREAR") {
      await descartarCreacion(db, op);
    }
  }

  await db.runAsync("DELETE FROM cola_sync WHERE id = ?", op.id);
}

interface CacheRemotos {
  lista: api.Docente[] | null;
}

async function buscarDuplicadoRemoto(
  correo: string,
  cache: CacheRemotos,
  refrescar = false
): Promise<api.Docente | null> {
  if (!cache.lista || refrescar) {
    cache.lista = await api.descargarDocentes();
  }

  const buscado = normalizar(correo);

  return (
    cache.lista.find((docente) => normalizar(docente.correo) === buscado) ??
    null
  );
}

// Envía una operación. Para las creaciones, antes comprueba si ya existe en la nube.
async function procesarOperacion(
  op: OperacionCola,
  cache: CacheRemotos
): Promise<{ resultado: api.ResultadoEnvio; duplicado: api.Docente | null }> {
  try {
    const datos = op.payload
      ? (JSON.parse(op.payload) as api.DatosDocente)
      : null;

    if (op.operacion === "CREAR" && datos) {
      let duplicado = await buscarDuplicadoRemoto(datos.correo, cache);

      if (duplicado) {
        return { resultado: { estado: "ok", cuerpo: null }, duplicado };
      }

      const resultado = await api.enviarCreacion(datos);

      // Otro usuario lo creó justo entre la comprobación y el envío.
      if (resultado.estado === "descartar" && resultado.codigo === 409) {
        duplicado = await buscarDuplicadoRemoto(datos.correo, cache, true);
      }

      return { resultado, duplicado };
    }

    return { resultado: await enviarOperacion(op, datos), duplicado: null };
  } catch (error) {
    return {
      resultado: {
        estado: "reintentar",
        motivo: error instanceof Error ? error.message : "Sin conexión.",
      },
      duplicado: null,
    };
  }
}

// Devuelve true si se envió al menos una operación.
async function enviarPendientes(): Promise<boolean> {
  let huboEnvios = false;
  const cache: CacheRemotos = { lista: null };

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

      // Las peticiones de red se hacen FUERA de la cola de la base de datos.
      const { resultado, duplicado } = await procesarOperacion(op, cache);

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

      await ejecutarEnBD(
        (db) =>
          duplicado
            ? resolverDuplicado(db, op, duplicado)
            : aplicarResultado(db, op, resultado),
        true
      );

      huboEnvios = true;
    }
  } catch (error) {
    console.warn("[sync docentes] Error enviando operaciones pendientes:", error);
  }

  return huboEnvios;
}

// ---------- Descarga y comparación con la nube (microservicios → local) ----------

interface FilaLocal {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  perfil: string | null;
  foto_url: string | null;
  programa_id: number;
}

async function descargarReferencia() {
  const [facultades, programas] = await Promise.all([
    api.descargarFacultades(),
    api.descargarProgramas(),
  ]);

  return { facultades, programas };
}

function mapaDeProgramas(programas: { id: number; nombre: string; facultad: string }[]) {
  const mapa = new Map<string, number>();

  programas.forEach((programa) => {
    mapa.set(clavePrograma(programa.facultad, programa.nombre), programa.id);
  });

  return mapa;
}

/**
 * Compara los docentes de la nube con los locales y aplica solo las diferencias:
 *  - Docente que no estaba en local  -> se inserta y se marca como "nuevo"
 *    (salvo en la primera descarga, que es la línea base).
 *  - Docente modificado en la nube   -> se actualiza.
 *  - Docente eliminado en la nube    -> se elimina.
 * Devuelve true si algo cambió.
 */
async function descargarEspejo(incluirReferencia: boolean): Promise<boolean> {
  const docentes = await api.descargarDocentes();

  let referencia = incluirReferencia ? await descargarReferencia() : null;

  let programasPorNombre = referencia
    ? mapaDeProgramas(referencia.programas)
    : await ejecutarEnBD(async (db) => {
        const filas = await db.getAllAsync<{
          id: number;
          nombre: string;
          facultad: string;
        }>(
          `SELECT p.id, p.nombre, f.nombre AS facultad
           FROM programas p JOIN facultades f ON f.id = p.facultad_id`
        );

        return mapaDeProgramas(filas);
      });

  // Si aparece un programa que aún no conocemos, se actualiza también la referencia.
  if (
    !referencia &&
    docentes.some(
      (d) =>
        d.programa_id == null &&
        !programasPorNombre.has(clavePrograma(d.facultad, d.programa))
    )
  ) {
    referencia = await descargarReferencia();
    programasPorNombre = mapaDeProgramas(referencia.programas);
  }

  return ejecutarEnBD(async (db) => {
    if (referencia) {
      await db.runAsync("DELETE FROM facultades");
      await db.runAsync("DELETE FROM programas");

      for (const facultad of referencia.facultades) {
        await db.runAsync(
          "INSERT INTO facultades (id, nombre, descripcion) VALUES (?, ?, ?)",
          facultad.id,
          facultad.nombre,
          facultad.descripcion ?? null
        );
      }

      for (const programa of referencia.programas) {
        await db.runAsync(
          "INSERT INTO programas (id, nombre, descripcion, facultad_id) VALUES (?, ?, ?, ?)",
          programa.id,
          programa.nombre,
          programa.descripcion ?? null,
          programa.facultad_id
        );
      }

      await guardarMeta(db, "ultima_referencia", String(Date.now()));
    }

    // Si el usuario hizo cambios mientras se descargaba, NO se sobrescriben los docentes locales.
    const pendientes =
      (
        await db.getFirstAsync<{ n: number }>(
          "SELECT COUNT(*) AS n FROM cola_sync"
        )
      )?.n ?? 0;

    if (pendientes > 0) {
      return false;
    }

    const esPrimeraDescarga =
      (await leerMeta(db, "ultima_descarga")) === null;

    const locales = await db.getAllAsync<FilaLocal>(
      `SELECT id, nombres, apellidos, correo, perfil, foto_url, programa_id
       FROM docentes`
    );

    const localesPorId = new Map(locales.map((fila) => [fila.id, fila]));
    const idsEnLaNube = new Set<number>();
    let huboCambios = false;

    for (const docente of docentes) {
      idsEnLaNube.add(docente.id);

      const programaId =
        docente.programa_id ??
        programasPorNombre.get(
          clavePrograma(docente.facultad, docente.programa)
        );

      if (!programaId) {
        console.warn(
          `[sync docentes] No se pudo determinar el programa del docente #${docente.id}.`
        );
        continue;
      }

      const local = localesPorId.get(docente.id);

      if (!local) {
        await db.runAsync(
          `INSERT INTO docentes
            (id, nombres, apellidos, correo, perfil, foto_url, programa_id, created_at, nuevo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          docente.id,
          docente.nombres,
          docente.apellidos,
          docente.correo,
          docente.perfil ?? null,
          docente.foto_url ?? null,
          programaId,
          docente.created_at ?? null,
          esPrimeraDescarga ? 0 : 1
        );
        huboCambios = true;
        continue;
      }

      const cambio =
        local.nombres !== docente.nombres ||
        local.apellidos !== docente.apellidos ||
        local.correo !== docente.correo ||
        (local.perfil ?? null) !== (docente.perfil ?? null) ||
        (local.foto_url ?? null) !== (docente.foto_url ?? null) ||
        local.programa_id !== programaId;

      if (cambio) {
        await db.runAsync(
          `UPDATE docentes
           SET nombres = ?, apellidos = ?, correo = ?, perfil = ?, foto_url = ?, programa_id = ?
           WHERE id = ?`,
          docente.nombres,
          docente.apellidos,
          docente.correo,
          docente.perfil ?? null,
          docente.foto_url ?? null,
          programaId,
          docente.id
        );
        huboCambios = true;
      }
    }

    for (const local of locales) {
      if (!idsEnLaNube.has(local.id)) {
        await db.runAsync("DELETE FROM docentes WHERE id = ?", local.id);
        huboCambios = true;
      }
    }

    await guardarMeta(db, "ultima_descarga", String(Date.now()));

    return huboCambios;
  }, true);
}

// ---------- Orquestación ----------

// Devuelve true si todo quedó sincronizado (sin operaciones pendientes).
async function ejecutarSincronizacion(): Promise<boolean> {
  if (!(await bdDisponible())) {
    return false;
  }

  const enLinea = await api.hayComunicacion();

  fijarEstado({ enLinea, ultimaRevision: Date.now() });

  if (!enLinea) {
    await refrescarEstado();
    return false;
  }

  const huboEnvios = await enviarPendientes();
  const pendientes = await contarOperacionesPendientes();
  let huboCambios = false;

  if (pendientes === 0) {
    try {
      const referenciaVencida =
        Date.now() - (await ultimaReferencia()) > VIGENCIA_REFERENCIA_MS;

      huboCambios = await descargarEspejo(referenciaVencida);
    } catch (error) {
      console.warn("[sync docentes] Error descargando datos de la nube:", error);
    }
  }

  await refrescarEstado();

  if (huboEnvios || huboCambios) {
    notificarCambioDatos();
  }

  return pendientes === 0;
}

let enCurso: Promise<boolean> | null = null;
let repetir = false;

/**
 * Sincroniza: envía lo pendiente y compara/actualiza el espejo local con la nube.
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

// ---------- Monitoreo periódico (intervalo elegido por el usuario) ----------

let intervaloMs = INTERVALO_POR_DEFECTO_MS;
let monitoreoActivo = false;
let temporizador: ReturnType<typeof setTimeout> | null = null;

// Cada ciclo se programa al terminar el anterior: nunca se acumulan sincronizaciones.
function programarSiguiente() {
  if (temporizador) {
    clearTimeout(temporizador);
    temporizador = null;
  }

  if (!monitoreoActivo) {
    return;
  }

  temporizador = setTimeout(async () => {
    await sincronizarDocentes();
    programarSiguiente();
  }, intervaloMs);
}

async function leerIntervaloGuardado(): Promise<number> {
  if (!(await bdDisponible())) {
    return intervaloMs;
  }

  const guardado = Number(
    await ejecutarEnBD((db) => leerMeta(db, "intervalo_ms"))
  );

  return INTERVALOS_DISPONIBLES_MS.includes(guardado)
    ? guardado
    : INTERVALO_POR_DEFECTO_MS;
}

// El cambio se aplica de inmediato y se conserva al cerrar la app.
export async function establecerIntervaloSincronizacion(
  ms: number
): Promise<void> {
  if (!INTERVALOS_DISPONIBLES_MS.includes(ms)) {
    return;
  }

  intervaloMs = ms;
  fijarEstado({ intervaloMs: ms });
  programarSiguiente();

  if (await bdDisponible()) {
    await ejecutarEnBD((db) => guardarMeta(db, "intervalo_ms", String(ms)));
  }
}

/**
 * Arranca el monitoreo de la nube: sincroniza al iniciar, al volver a primer plano
 * y cada "intervalo" segundos (2, 10 o 30 según elija el usuario).
 * Devuelve la función para detenerlo.
 */
export function iniciarSincronizacionDocentes(): () => void {
  monitoreoActivo = true;

  void (async () => {
    intervaloMs = await leerIntervaloGuardado();
    fijarEstado({ intervaloMs });

    await sincronizarDocentes();
    programarSiguiente();
  })();

  const suscripcion = AppState.addEventListener("change", (estado) => {
    if (estado === "active") {
      void sincronizarDocentes();
    }
  });

  return () => {
    monitoreoActivo = false;

    if (temporizador) {
      clearTimeout(temporizador);
      temporizador = null;
    }

    suscripcion.remove();
  };
}