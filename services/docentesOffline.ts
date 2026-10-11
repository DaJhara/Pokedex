import type { SQLiteDatabase } from "expo-sqlite";

import {
  bdDisponible,
  ejecutarEnBD,
  guardarMeta,
  leerMeta,
} from "../database/docentesDb";
import * as api from "./docentesApi";
import {
  sincronizarDocentes,
  suscribirseASincronizacion,
  type TipoOperacion,
  ultimaDescarga,
} from "./docentesSync";

export type { DatosDocente, Docente, Programa } from "./docentesApi";
export { suscribirseASincronizacion };

/**
 * Capa que usa la pantalla de Docentes. Todo se lee y escribe en SQLite,
 * por lo que funciona igual con o sin conexión. Cada cambio queda en una cola
 * y se envía a los microservicios en cuanto hay comunicación.
 *
 * Si SQLite no está disponible en la plataforma, se mantiene el comportamiento
 * original: consultas y cambios directos contra los microservicios.
 */

// Primera vez: se necesita al menos una descarga para tener el espejo local.
async function prepararEspejo(): Promise<void> {
  if ((await ultimaDescarga()) === 0) {
    await sincronizarDocentes();
  } else {
    void sincronizarDocentes(); // refresco en segundo plano
  }
}

// ---------- Lectura ----------

// Lectura pura del espejo local (no dispara sincronización).
export async function leerDocentesLocales(
  termino: string
): Promise<api.Docente[]> {
  const filas = await ejecutarEnBD((db) =>
    db.getAllAsync<api.Docente>(
      `SELECT
         d.id,
         d.nombres,
         d.apellidos,
         f.nombre AS facultad,
         p.nombre AS programa,
         d.programa_id,
         d.correo,
         d.perfil,
         d.foto_url,
         d.created_at
       FROM docentes d
       JOIN programas p ON p.id = d.programa_id
       JOIN facultades f ON f.id = p.facultad_id`
    )
  );

  const buscado = termino.trim().toLowerCase();

  return filas
    .filter(
      (docente) =>
        !buscado ||
        docente.nombres.toLowerCase().includes(buscado) ||
        docente.apellidos.toLowerCase().includes(buscado)
    )
    .sort(
      (a, b) =>
        a.apellidos.localeCompare(b.apellidos, "es") ||
        a.nombres.localeCompare(b.nombres, "es")
    );
}

export async function consultarDocentes(
  termino: string
): Promise<api.Docente[]> {
  if (!(await bdDisponible())) {
    return api.descargarDocentes(termino);
  }

  await prepararEspejo();

  return leerDocentesLocales(termino);
}

export async function consultarProgramas(): Promise<api.Programa[]> {
  if (!(await bdDisponible())) {
    return api.descargarProgramas();
  }

  await prepararEspejo();

  return ejecutarEnBD((db) =>
    db.getAllAsync<api.Programa>(
      `SELECT
         p.id,
         p.nombre,
         COALESCE(p.descripcion, '') AS descripcion,
         p.facultad_id,
         f.nombre AS facultad
       FROM programas p
       JOIN facultades f ON f.id = p.facultad_id
       ORDER BY f.nombre, p.nombre`
    )
  );
}

// ---------- Escritura ----------

// Los docentes creados sin conexión usan IDs negativos hasta que el servidor asigna el real.
async function siguienteIdLocal(db: SQLiteDatabase): Promise<number> {
  const siguiente = (Number(await leerMeta(db, "ultimo_id_local")) || 0) - 1;

  await guardarMeta(db, "ultimo_id_local", String(siguiente));

  return siguiente;
}

// Si un ID temporal ya fue sincronizado, devuelve el ID real.
async function resolverId(db: SQLiteDatabase, id: number): Promise<number> {
  if (id >= 0) {
    return id;
  }

  const fila = await db.getFirstAsync<{ remote_id: number }>(
    "SELECT remote_id FROM mapa_ids WHERE local_id = ?",
    id
  );

  return fila?.remote_id ?? id;
}

async function encolar(
  db: SQLiteDatabase,
  operacion: TipoOperacion,
  docenteId: number,
  datos: api.DatosDocente | null
): Promise<void> {
  await db.runAsync(
    "INSERT INTO cola_sync (operacion, docente_id, payload, creado_en) VALUES (?, ?, ?, ?)",
    operacion,
    docenteId,
    datos ? JSON.stringify(datos) : null,
    new Date().toISOString()
  );
}

async function validarCorreoUnico(
  db: SQLiteDatabase,
  correo: string,
  idExcluido: number
): Promise<void> {
  const repetido = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM docentes WHERE LOWER(correo) = ? AND id <> ?",
    correo.trim().toLowerCase(),
    idExcluido
  );

  if (repetido) {
    throw new Error("El correo ya está registrado.");
  }
}

function comprobarEnvio(resultado: api.ResultadoEnvio): void {
  if (resultado.estado !== "ok") {
    throw new Error(resultado.motivo);
  }
}

export async function crearDocente(datos: api.DatosDocente): Promise<void> {
  if (!(await bdDisponible())) {
    comprobarEnvio(await api.enviarCreacion(datos));
    return;
  }

  await ejecutarEnBD(async (db) => {
    await validarCorreoUnico(db, datos.correo, 0);

    const idLocal = await siguienteIdLocal(db);

    await db.runAsync(
      `INSERT INTO docentes
        (id, nombres, apellidos, correo, perfil, foto_url, programa_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      idLocal,
      datos.nombres,
      datos.apellidos,
      datos.correo,
      datos.perfil,
      datos.foto_url,
      datos.programa_id,
      new Date().toISOString()
    );

    await encolar(db, "CREAR", idLocal, datos);
  }, true);

  void sincronizarDocentes();
}

export async function actualizarDocente(
  id: number,
  datos: api.DatosDocente
): Promise<void> {
  if (!(await bdDisponible())) {
    comprobarEnvio(await api.enviarActualizacion(id, datos));
    return;
  }

  await ejecutarEnBD(async (db) => {
    const idReal = await resolverId(db, id);

    await validarCorreoUnico(db, datos.correo, idReal);

    const resultado = await db.runAsync(
      `UPDATE docentes
       SET nombres = ?, apellidos = ?, correo = ?, perfil = ?, foto_url = ?, programa_id = ?
       WHERE id = ?`,
      datos.nombres,
      datos.apellidos,
      datos.correo,
      datos.perfil,
      datos.foto_url,
      datos.programa_id,
      idReal
    );

    if (resultado.changes === 0) {
      throw new Error("No se encontró el docente a actualizar.");
    }

    await encolar(db, "ACTUALIZAR", idReal, datos);
  }, true);

  void sincronizarDocentes();
}

export async function borrarDocente(id: number): Promise<void> {
  if (!(await bdDisponible())) {
    comprobarEnvio(await api.enviarEliminacion(id));
    return;
  }

  await ejecutarEnBD(async (db) => {
    const idReal = await resolverId(db, id);

    await db.runAsync("DELETE FROM docentes WHERE id = ?", idReal);
    await encolar(db, "ELIMINAR", idReal, null);
  }, true);

  void sincronizarDocentes();
}