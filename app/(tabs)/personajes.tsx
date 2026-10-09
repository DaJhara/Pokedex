import React, { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useOnePiece } from "../../context/OnePieceContext";

export default function PersonajesScreen() {
  const [busqueda, setBusqueda] = useState("");

  const {
    personaje,
    cargando,
    error,
    buscarPersonaje,
  } = useOnePiece();

  const obtenerPersonaje = async () => {
    if (!busqueda.trim()) {
      Alert.alert(
        "Campo vacío",
        "Escribe el nombre de un personaje."
      );

      return;
    }

    await buscarPersonaje(busqueda);
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* TÍTULO */}
      <Text style={styles.titulo}>
        Personajes de One Piece
      </Text>

      {/* BUSCADOR */}
      <View style={styles.buscador}>
        <TextInput
          style={styles.input}
          placeholder="Nombre del personaje"
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
          onSubmitEditing={obtenerPersonaje}
          returnKeyType="search"
        />

        <TouchableOpacity
          style={[
            styles.botonBuscar,
            cargando && styles.botonDeshabilitado,
          ]}
          onPress={obtenerPersonaje}
          disabled={cargando}
        >
          <Text style={styles.textoBoton}>
            {cargando ? "Buscando..." : "Buscar"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* CARGANDO */}
      {cargando && (
        <ActivityIndicator
          size="large"
          color="#cae725"
          style={styles.loading}
        />
      )}

      {/* MENSAJE INICIAL O ERROR */}
      {!cargando && !personaje && (
        <View style={styles.mensajeInicial}>
          <Text style={styles.textoInicial}>
            {error ||
              "Busca un personaje para ver su información."}
          </Text>
        </View>
      )}

      {/* PERSONAJE */}
      {!cargando && personaje && (
        <View style={styles.tarjeta}>
          {/* NOMBRE */}
          <Text style={styles.nombrePersonaje}>
            {personaje.name?.en ||
              personaje.name?.romaji ||
              "Sin nombre"}
          </Text>

          {/* IMAGEN */}
          {personaje.image_url && (
            <Image
              source={{
                uri: personaje.image_url,
              }}
              style={styles.imagen}
              resizeMode="contain"
            />
          )}

          {/* DATOS */}
          <View style={styles.informacion}>
            {personaje.age !== null && (
              <View style={styles.dato}>
                <Text style={styles.etiqueta}>
                  Edad
                </Text>

                <Text style={styles.valor}>
                  {personaje.age}
                </Text>
              </View>
            )}

            {personaje.height !== null && (
              <View style={styles.dato}>
                <Text style={styles.etiqueta}>
                  Altura
                </Text>

                <Text style={styles.valor}>
                  {personaje.height}
                </Text>
              </View>
            )}

            {personaje.blood_type && (
              <View style={styles.dato}>
                <Text style={styles.etiqueta}>
                  Sangre
                </Text>

                <Text style={styles.valor}>
                  {personaje.blood_type}
                </Text>
              </View>
            )}

            {personaje.status && (
              <View style={styles.dato}>
                <Text style={styles.etiqueta}>
                  Estado
                </Text>

                <Text style={styles.valor}>
                  {personaje.status}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#803333",
    padding: 20,
    paddingTop: 45,
  },

  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#cae725",
  },

  buscador: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 15,
  },

  input: {
    flex: 1,
    height: 50,
    borderWidth: 2,
    borderColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginRight: 8,
    backgroundColor: "#f5f2f2",
  },

  botonBuscar: {
    height: 50,
    paddingHorizontal: 18,
    backgroundColor: "#6fd3ec",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  textoBoton: {
    color: "#fff",
    fontWeight: "bold",
  },

  loading: {
    marginTop: 40,
  },

  mensajeInicial: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },

  textoInicial: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },

  tarjeta: {
    borderWidth: 2,
    borderColor: "#222",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#f5f2f2",
    marginBottom: 20,
  },

  nombrePersonaje: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },

  imagen: {
    width: 250,
    height: 250,
    marginBottom: 10,
  },

  informacion: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    justifyContent: "space-around",
    marginTop: 10,
  },

  dato: {
    alignItems: "center",
    minWidth: 100,
    marginVertical: 8,
  },

  etiqueta: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
  },

  valor: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 5,
  },
});