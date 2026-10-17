import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
    descartarAvisosConflictos,
    establecerIntervaloSincronizacion,
    INTERVALOS_DISPONIBLES_MS,
    marcarTodosVistos,
} from "../services/docentesSync";
import { useEstadoSincronizacion } from "../services/useSincronizacionDocentes";

export default function PanelSincronizacion() {
  const estado = useEstadoSincronizacion();

  // Sin SQLite (modo solo en línea) no hay nada que sincronizar.
  if (!estado.sqlite) {
    return null;
  }

  const colorEstado =
    estado.enLinea === null
      ? "#999"
      : estado.enLinea
        ? "#2e9e4f"
        : "#c0392b";

  const textoEstado =
    estado.enLinea === null
      ? "Comprobando conexión..."
      : estado.enLinea
        ? "Conectado a la nube"
        : "Sin conexión (trabajando en local)";

  const hora = estado.ultimaRevision
    ? new Date(estado.ultimaRevision).toLocaleTimeString()
    : "—";

  return (
    <View style={styles.panel}>
      <View style={styles.fila}>
        <View style={[styles.punto, { backgroundColor: colorEstado }]} />
        <Text style={styles.textoEstado}>{textoEstado}</Text>
      </View>

      <Text style={styles.detalle}>
        Última revisión: {hora}
        {estado.pendientes > 0
          ? `  ·  ${estado.pendientes} cambio${
              estado.pendientes === 1 ? "" : "s"
            } por enviar`
          : ""}
      </Text>

      <Text style={styles.etiqueta}>Revisar la nube cada:</Text>

      <View style={styles.filaOpciones}>
        {INTERVALOS_DISPONIBLES_MS.map((ms) => {
          const activo = estado.intervaloMs === ms;

          return (
            <TouchableOpacity
              key={ms}
              style={[styles.opcion, activo && styles.opcionActiva]}
              onPress={() => void establecerIntervaloSincronizacion(ms)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Revisar la nube cada ${ms / 1000} segundos`}
            >
              <Text style={styles.textoOpcion}>{ms / 1000} s</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {estado.nuevos > 0 && (
        <View style={styles.avisoNuevos}>
          <View style={styles.fila}>
            <Ionicons name="cloud-download-outline" size={20} color="#803333" />
            <Text style={styles.textoAviso}>
              {estado.nuevos === 1
                ? "Se insertó 1 docente nuevo en la nube"
                : `Se insertaron ${estado.nuevos} docentes nuevos en la nube`}
            </Text>
          </View>

          <Text style={styles.detalle}>
            {estado.nombresNuevos.join(", ")}
            {estado.nuevos > estado.nombresNuevos.length ? "…" : ""}
          </Text>

          <Text style={styles.detalle}>
            Búscalos para ver la etiqueta NUEVO en cada uno.
          </Text>

          <TouchableOpacity
            style={styles.botonPequeno}
            onPress={() => void marcarTodosVistos()}
            activeOpacity={0.8}
          >
            <Text style={styles.textoBoton}>Marcar como vistos</Text>
          </TouchableOpacity>
        </View>
      )}

      {estado.conflictos.length > 0 && (
        <View style={styles.avisoConflictos}>
          <View style={styles.fila}>
            <Ionicons name="git-compare-outline" size={20} color="#803333" />
            <Text style={styles.textoAviso}>Resultado de la sincronización</Text>
          </View>

          {estado.conflictos.map((conflicto) => (
            <Text key={conflicto.id} style={styles.detalleConflicto}>
              • {conflicto.mensaje}
            </Text>
          ))}

          <TouchableOpacity
            style={styles.botonPequeno}
            onPress={() => void descartarAvisosConflictos()}
            activeOpacity={0.8}
          >
            <Text style={styles.textoBoton}>Entendido</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#fff",
    borderColor: "#222",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
    gap: 6,
  },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  punto: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },

  textoEstado: {
    color: "#222",
    fontSize: 14,
    fontWeight: "bold",
    flex: 1,
  },

  detalle: {
    color: "#555",
    fontSize: 12,
    lineHeight: 17,
  },

  etiqueta: {
    color: "#803333",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },

  filaOpciones: {
    flexDirection: "row",
    gap: 8,
  },

  opcion: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    backgroundColor: "#f5f2f2",
    borderColor: "#222",
    borderWidth: 1.2,
    borderRadius: 10,
  },

  opcionActiva: {
    backgroundColor: "#6fd3ec",
  },

  textoOpcion: {
    color: "#222",
    fontSize: 13,
    fontWeight: "bold",
  },

  avisoNuevos: {
    backgroundColor: "#e8f7fc",
    borderColor: "#6fd3ec",
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 9,
    marginTop: 6,
    gap: 5,
  },

  avisoConflictos: {
    backgroundColor: "#f7fbd9",
    borderColor: "#cae725",
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 9,
    marginTop: 6,
    gap: 5,
  },

  textoAviso: {
    color: "#803333",
    fontSize: 13,
    fontWeight: "bold",
    flex: 1,
  },

  detalleConflicto: {
    color: "#333",
    fontSize: 12,
    lineHeight: 17,
  },

  botonPequeno: {
    alignSelf: "flex-start",
    backgroundColor: "#6fd3ec",
    borderColor: "#222",
    borderWidth: 1.3,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 2,
  },

  textoBoton: {
    color: "#222",
    fontSize: 12,
    fontWeight: "bold",
  },
});
