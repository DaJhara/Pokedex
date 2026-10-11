import React from "react";

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useOnePiece } from "../../context/OnePieceContext";

export default function FrutasScreen() {
  const { personaje } = useOnePiece();

  if (!personaje) {
    return (
      <View style={styles.container}>
        <Text style={styles.titulo}>
          Datos de One Piece
        </Text>

        <View style={styles.mensajeInicial}>
          <Text style={styles.textoInicial}>
            Primero busca un personaje en la
            pantalla Personajes.
          </Text>
        </View>
      </View>
    );
  }

  const extraData = personaje.extra_data;
  const nombres = personaje.name_localized;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contenido}
    >
      {/* TÍTULO */}
      <Text style={styles.titulo}>
        Datos de{" "}
        {nombres?.en ||
          nombres?.romaji ||
          personaje.name ||
          "Personaje"}
      </Text>

      {/* NOMBRES */}
      <View style={styles.tarjeta}>
        <Text style={styles.tituloTarjeta}>
          Nombres
        </Text>

        <View style={styles.dato}>
          <Text style={styles.etiqueta}>
            Nombre
          </Text>

          <Text style={styles.valor}>
            {personaje.name || "No disponible"}
          </Text>
        </View>

        {nombres?.jp && (
          <View style={styles.dato}>
            <Text style={styles.etiqueta}>
              Japonés
            </Text>

            <Text style={styles.valor}>
              {nombres.jp}
            </Text>
          </View>
        )}

        {nombres?.romaji && (
          <View style={styles.dato}>
            <Text style={styles.etiqueta}>
              Romaji
            </Text>

            <Text style={styles.valor}>
              {nombres.romaji}
            </Text>
          </View>
        )}
      </View>

      {/* INFORMACIÓN PERSONAL */}
      <View style={styles.tarjeta}>
        <Text style={styles.tituloTarjeta}>
          Información personal
        </Text>

        {personaje.age !== null &&
          personaje.age !== undefined && (
            <View style={styles.dato}>
              <Text style={styles.etiqueta}>
                Edad
              </Text>

              <Text style={styles.valor}>
                {personaje.age}
              </Text>
            </View>
          )}

        {personaje.birthday !== null &&
          personaje.birthday !== undefined && (
            <View style={styles.dato}>
              <Text style={styles.etiqueta}>
                Cumpleaños
              </Text>

              <Text style={styles.valor}>
                {String(personaje.birthday)}
              </Text>
            </View>
          )}
      </View>

      {/* RECOMPENSAS */}
      <View style={styles.tarjeta}>
        <Text style={styles.tituloTarjeta}>
          Recompensas
        </Text>

        {(personaje.bounties ?? []).length === 0 ? (
          <Text style={styles.sinDatos}>
            No hay recompensas registradas.
          </Text>
        ) : (
          personaje.bounties.map((bounty, index) => (
            <View
              key={bounty.id || index}
              style={styles.dato}
            >
              <Text style={styles.etiqueta}>
                Recompensa
              </Text>

              <Text style={styles.recompensa}>
                {bounty.amount !== null &&
                bounty.amount !== undefined
                  ? `${bounty.amount.toLocaleString(
                      "es-CO"
                    )} ฿`
                  : "Desconocida"}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* DATOS ADICIONALES */}
      {extraData &&
        Object.values(extraData).some(
          (valor) =>
            valor !== null &&
            valor !== undefined &&
            valor !== ""
        ) && (
          <View style={styles.tarjeta}>
            <Text style={styles.tituloTarjeta}>
              Información adicional
            </Text>

            {Object.entries(extraData).map(
              ([clave, valor]) => {
                if (
                  valor === null ||
                  valor === undefined ||
                  valor === ""
                ) {
                  return null;
                }

                return (
                  <View
                    key={clave}
                    style={styles.dato}
                  >
                    <Text style={styles.etiqueta}>
                      {formatearClave(clave)}
                    </Text>

                    <Text style={styles.valor}>
                      {formatearValor(valor)}
                    </Text>
                  </View>
                );
              }
            )}
          </View>
        )}
    </ScrollView>
  );
}

function formatearClave(clave: string): string {
  return clave
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letra) =>
      letra.toUpperCase()
    );
}

function formatearValor(valor: unknown): string {
  if (
    typeof valor === "string" ||
    typeof valor === "number" ||
    typeof valor === "boolean"
  ) {
    return String(valor);
  }

  if (Array.isArray(valor)) {
    return valor
      .map((item) => formatearValor(item))
      .join(", ");
  }

  if (typeof valor === "object" && valor !== null) {
    return Object.values(valor as Record<string, unknown>)
      .filter(
        (item) =>
          item !== null &&
          item !== undefined
      )
      .map((item) => formatearValor(item))
      .join(", ");
  }

  return String(valor);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#803333",
    padding: 20,
    paddingTop: 45,
  },

  contenido: {
    paddingBottom: 30,
  },

  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#cae725",
  },

  tarjeta: {
    backgroundColor: "#f5f2f2",
    borderWidth: 2,
    borderColor: "#222",
    borderRadius: 10,
    padding: 18,
    marginBottom: 15,
  },

  tituloTarjeta: {
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },

  dato: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 10,
  },

  etiqueta: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 4,
  },

  valor: {
    fontSize: 17,
    fontWeight: "bold",
  },

  recompensa: {
    fontSize: 21,
    fontWeight: "bold",
  },

  sinDatos: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
  },

  mensajeInicial: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  textoInicial: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
});