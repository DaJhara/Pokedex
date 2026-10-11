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
  View
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { usePokemon } from "../../context/PokemonContext";

export default function HomeScreen() {
  const [nombre, setNombre] = useState("");

  const {
    pokemon,
    cargando,
    imagenActual,
    tieneFormaFemenina,
    mostrarFemenina,
    cambiarForma,
    buscarPokemon,
    cambiarShiny,
  } = usePokemon();

  const realizarBusqueda = async () => {
    if (!nombre.trim()) {
      Alert.alert(
        "Campo vacío",
        "Escribe el nombre de un Pokémon."
      );
      return;
    }

    await buscarPokemon(nombre);
  };

  const imagenNormal = pokemon
  ? mostrarFemenina
    ? pokemon.sprites.front_female
    : pokemon.sprites.front_default
  : null;

  const imagenShiny = pokemon
    ? mostrarFemenina
      ? pokemon.sprites.front_shiny_female
      : pokemon.sprites.front_shiny
    : null;

  return (
    <ScrollView style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.titulo}>
        Buscar Pokémon
      </Text>

      {/* BUSCADOR */}
      <View style={styles.buscador}>
        <TextInput
          style={styles.input}
          placeholder="Nombre del Pokémon"
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="none"
          onSubmitEditing={realizarBusqueda}
        />

        <TouchableOpacity
          style={styles.botonBuscar}
          onPress={realizarBusqueda}
        >
          <Text style={styles.textoBoton}>
            Buscar
          </Text>
        </TouchableOpacity>
      </View>

      {/* CARGANDO */}
      {cargando && (
        <ActivityIndicator
          size="large"
          style={styles.loading}
        />
      )}

      {/* RESULTADO */}
      {pokemon && !cargando && (
        <View style={styles.tarjeta}>

          {/* NOMBRE */}
          <Text style={styles.nombrePokemon}>
            {pokemon.name.toUpperCase()}
          </Text>

          {/* ICONOS */} 
          <View style={styles.iconosContainer}> 
            {/* BOTÓN DE FORMA */} 
            {tieneFormaFemenina && ( 
              <TouchableOpacity 
                style={styles.botonGenero} 
                onPress={cambiarForma} 
              > 
                <Ionicons 
                  name={mostrarFemenina ? "male" : "female"} 
                  size={15} 
                  color="#e70cb8" 
                /> 
              </TouchableOpacity> 
            )} 
          </View>

          {/* IMAGEN PRINCIPAL */}
          {imagenActual && (
            <Image
              source={{
                uri: imagenActual,
              }}
              style={styles.imagen}
              resizeMode="contain"
            />
          )}

          {/* IMÁGENES SECUNDARIAS */}
          <View style={styles.imagenesSecundarias}>

            {/* NORMAL */}
            <TouchableOpacity
              style={[
                styles.contenedorImagenSecundaria,
                imagenActual === imagenNormal && styles.botonImagenDesactivado,
              ]}
              onPress={() => cambiarShiny(false)}
              disabled={imagenActual === imagenNormal}
            >
              {(
                mostrarFemenina
                  ? pokemon.sprites.front_female
                  : pokemon.sprites.front_default
              ) && (
                <Image
                  source={{
                    uri:
                      mostrarFemenina
                        ? pokemon.sprites.front_female!
                        : pokemon.sprites.front_default!,
                  }}
                  style={styles.imagenSecundaria}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>

            {/* SHINY */}
            <TouchableOpacity
              style={[
                styles.contenedorImagenSecundaria,
                imagenActual === imagenShiny && styles.botonImagenDesactivado,
              ]}
              onPress={() => cambiarShiny(true)}
              disabled={imagenActual === imagenShiny}
            >
              {(
                mostrarFemenina
                  ? pokemon.sprites.front_shiny_female
                  : pokemon.sprites.front_shiny
              ) && (
                <Image
                  source={{
                    uri:
                      mostrarFemenina
                        ? pokemon.sprites.front_shiny_female!
                        : pokemon.sprites.front_shiny!,
                  }}
                  style={styles.imagenSecundaria}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>

          </View>

          {/* ALTURA Y PESO */}
          <View style={styles.informacion}>

            <View style={styles.dato}>
              <Text style={styles.etiqueta}>
                Altura
              </Text>

              <Text style={styles.valor}>
                {(pokemon.height / 10).toFixed(1)} m
              </Text>
            </View>

            <View style={styles.dato}>
              <Text style={styles.etiqueta}>
                Peso
              </Text>

              <Text style={styles.valor}>
                {(pokemon.weight / 10).toFixed(1)} kg
              </Text>
            </View>

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
    marginBottom: 25,
    color: "#cae725",
  },
  buscador: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 20,
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
  textoBoton: {
    color: "#fff",
    fontWeight: "bold",
  },
  loading: {
    marginTop: 40,
  },
  tarjeta: {
    borderWidth: 2,
    borderColor: "#222",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#f5f2f2",
  },
  nombrePokemon: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  imagen: {
    width: 250,
    height: 250,
  },
  imagenesSecundarias: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
    marginBottom: 10,
  },
  contenedorImagenSecundaria: {
    width: "48%",
    height: 100,
    borderWidth: 2,
    borderColor: "#6fd3ec",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  imagenSecundaria: {
    width: "90%",
    height: "90%",
  },
  botonGenero: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f5f2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  informacion: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    marginVertical: 15,
  },
  dato: {
    alignItems: "center",
    minWidth: 100,
  },
  etiqueta: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
  },
  valor: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
  },
  iconosContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 10, 
    marginBottom: 10, 
  },
  botonImagenDesactivado: {
    opacity: 0.6,
  },
  scroll: {
    flex: 1,
    backgroundColor: "#803333",
  },
});