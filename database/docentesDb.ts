import type { SQLiteDatabase } from "expo-sqlite";

const NOMBRE_BD = "docentes_local.db";

/**
 * Espejo local de la base de datos de docentes (facultades, programas y docentes)
 * más las tablas auxiliares de sincronización:
 *  - cola_sync: operaciones del CRUD realizadas sin conexión, pendientes de enviar.
 *  - mapa_ids:  equivalencia entre IDs temporales (negativos) e IDs reales del servidor.
 *  - meta:      valores sueltos (última descarga, contador de IDs temporales).
 */
const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS facultades (
    id INTEGER PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT
  );

  CREATE TABLE IF NOT EXISTS programas (
    id INTEGER PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    facultad_id INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS docentes (
    id INTEGER PRIMARY KEY NOT NULL,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    correo TEXT NOT NULL,
    perfil TEXT,
    foto_url TEXT,
    programa_id INTEGER NOT NULL,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS cola_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operacion TEXT NOT NULL,
    docente_id INTEGER NOT NULL,
    payload TEXT,
    creado_en TEXT NOT NULL,
    intentos INTEGER NOT NULL DEFAULT 0,
    ultimo_error TEXT
  );

  CREATE TABLE IF NOT EXISTS mapa_ids (
    local_id INTEGER PRIMARY KEY NOT NULL,
    remote_id INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    clave TEXT PRIMARY KEY NOT NULL,
    valor TEXT
  );
`;

let conexion: Promise<SQLiteDatabase | null> | null = null;

async function abrirBaseDeDatos(): Promise<SQLiteDatabase | null> {
  try {
    // Import dinámico: expo-sqlite solo se carga en el cliente cuando se necesita
    // (evita problemas con el renderizado estático de web).
    const SQLite = await import("expo-sqlite");
    const db = await SQLite.openDatabaseAsync(NOMBRE_BD);

    await db.execAsync(ESQUEMA);

    return db;
  } catch (error) {
    // Si SQLite no está disponible (p. ej. web sin configurar), la app
    // sigue funcionando en modo "solo en línea", como antes.
    console.warn("SQLite no disponible, se usará solo el modo en línea:", error);
    return null;
  }
}

export function obtenerBD(): Promise<SQLiteDatabase | null> {
  if (!conexion) {
    conexion = abrirBaseDeDatos();
  }

  return conexion;
}

export async function bdDisponible(): Promise<boolean> {
  return (await obtenerBD()) !== null;
}

/**
 * Cola de ejecución: garantiza que solo una operación (o transacción) use la
 * conexión a la vez. Evita mezclar la sincronización en segundo plano con
 * las operaciones que el usuario hace desde la pantalla.
 * Importante: NO anidar llamadas a ejecutarEnBD dentro de otra.
 */
let turno: Promise<unknown> = Promise.resolve();

export function ejecutarEnBD<T>(
  tarea: (db: SQLiteDatabase) => Promise<T>,
  conTransaccion = false
): Promise<T> {
  const ejecucion = turno.then(async () => {
    const db = await obtenerBD();

    if (!db) {
      throw new Error("La base de datos local no está disponible.");
    }

    if (!conTransaccion) {
      return tarea(db);
    }

    let resultado!: T;

    await db.withTransactionAsync(async () => {
      resultado = await tarea(db);
    });

    return resultado;
  });

  turno = ejecucion.catch(() => undefined);

  return ejecucion;
}

export async function leerMeta(
  db: SQLiteDatabase,
  clave: string
): Promise<string | null> {
  const fila = await db.getFirstAsync<{ valor: string | null }>(
    "SELECT valor FROM meta WHERE clave = ?",
    clave
  );

  return fila?.valor ?? null;
}

export async function guardarMeta(
  db: SQLiteDatabase,
  clave: string,
  valor: string
): Promise<void> {
  await db.runAsync(
    "INSERT OR REPLACE INTO meta (clave, valor) VALUES (?, ?)",
    clave,
    valor
  );
}