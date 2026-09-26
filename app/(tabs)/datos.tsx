import React from "react";

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { usePokemon } from "../../context/PokemonContext";

export default function DatosScreen() {

  const {
    pokemon,
    cargando,
  } = usePokemon();

  // Cargando
  if (cargando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#cae725"
        />
      </View>
    );
  }

  // No hay Pokémon
  if (!pokemon) {
    return (
      <View style={styles.container}>

        <Text style={styles.titulo}>
          Datos del Pokémon
        </Text>

        <View style={styles.tarjeta}>

          <Text style={styles.mensaje}>
            Primero busca un Pokémon
            en la pantalla de inicio.
          </Text>

        </View>

      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >

      {/* TÍTULO */}

      <Text style={styles.titulo}>
        Datos del Pokémon
      </Text>

      {/* NOMBRE */}

      <View style={styles.tarjetaNombre}>

        <Text style={styles.nombrePokemon}>
          {pokemon.name.toUpperCase()}
        </Text>

      </View>

      {/* ESPECIE */}

      <View style={styles.tarjeta}>

        <Text style={styles.subtitulo}>
          Especie
        </Text>

        <Text style={styles.valor}>
          {pokemon.species.name}
        </Text>

      </View>

      {/* ESTADÍSTICAS */}

      <View style={styles.tarjeta}>

        <Text style={styles.subtitulo}>
          Estadísticas
        </Text>

        {pokemon.stats.map((stat) => {

          const porcentaje =
            Math.min(
              (stat.base_stat / 255) * 100,
              100
            );

          return (
            <View
              key={stat.stat.name}
              style={styles.stat}
            >

              {/* NOMBRE Y VALOR */}

              <View style={styles.statHeader}>

                <Text style={styles.statNombre}>
                  {traducirStat(stat.stat.name)}
                </Text>

                <Text style={styles.statValor}>
                  {stat.base_stat}
                </Text>

              </View>

              {/* BARRA */}

              <View style={styles.barraFondo}>

                <View
                  style={[
                    styles.barraProgreso,
                    {
                      width: `${porcentaje}%`,
                    },
                  ]}
                />

              </View>

            </View>
          );
        })}

      </View>

      {/* MOVIMIENTOS */}

      <View style={styles.tarjetaMovimientos}>

        <Text style={styles.subtitulo}>
          Movimientos
        </Text>

        <Text style={styles.contadorMovimientos}>
          {pokemon.moves.length} movimientos
        </Text>

        {/* SCROLL INTERNO */}

        <ScrollView
          style={styles.listaMovimientos}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >

          {pokemon.moves.map(
            (movimiento, index) => (

              <View
                key={`${movimiento.move.name}-${index}`}
                style={styles.movimiento}
              >

                <View style={styles.numeroContainer}>

                  <Text style={styles.numero}>
                    {index + 1}
                  </Text>

                </View>

                <Text
                  style={styles.movimientoNombre}
                >
                  {movimiento.move.name}
                </Text>

              </View>

            )
          )}

        </ScrollView>

      </View>

    </ScrollView>
  );
}

/* -------------------------------- */
/* TRADUCIR ESTADÍSTICAS             */
/* -------------------------------- */

function traducirStat(stat: string) {

  const traducciones: {
    [key: string]: string;
  } = {

    hp: "Vida",

    attack: "Ataque",

    defense: "Defensa",

    "special-attack":
      "Ataque especial",

    "special-defense":
      "Defensa especial",

    speed: "Velocidad",

  };

  return traducciones[stat] || stat;
}

/* -------------------------------- */
/* ESTILOS                           */
/* -------------------------------- */

const styles = StyleSheet.create({

  scroll: {
    flex: 1,
    backgroundColor: "#803333",
  },

  container: {
    flexGrow: 1,
    backgroundColor: "#803333",
    padding: 20,
    paddingTop: 45,
    paddingBottom: 40,
  },

  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
    color: "#cae725",
  },

  /* NOMBRE */

  tarjetaNombre: {
    borderWidth: 2,
    borderColor: "#222",
    borderRadius: 10,
    padding: 18,
    alignItems: "center",
    backgroundColor: "#f5f2f2",
    marginBottom: 20,
  },

  nombrePokemon: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#222",
  },

  /* TARJETAS */

  tarjeta: {
    borderWidth: 2,
    borderColor: "#222",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    backgroundColor: "#f5f2f2",
  },

  subtitulo: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#222",
  },

  valor: {
    fontSize: 18,
    color: "#333",
  },

  /* STATS */

  stat: {
    marginBottom: 16,
  },

  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  statNombre: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },

  statValor: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },

  barraFondo: {
    height: 12,
    width: "100%",
    backgroundColor: "#d6d6d6",
    borderRadius: 10,
    overflow: "hidden",
  },

  barraProgreso: {
    height: "100%",
    backgroundColor: "#6fd3ec",
    borderRadius: 10,
  },

  /* MOVIMIENTOS */

  tarjetaMovimientos: {
    borderWidth: 2,
    borderColor: "#222",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    backgroundColor: "#f5f2f2",
  },

  contadorMovimientos: {
    fontSize: 14,
    color: "#777",
    marginTop: -8,
    marginBottom: 12,
  },

  listaMovimientos: {
    height: 300,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  movimiento: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  numeroContainer: {
    width: 35,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  numero: {
    fontWeight: "bold",
    color: "#803333",
  },

  movimientoNombre: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },

  /* MENSAJE */
  mensaje: {
    textAlign: "center",
    color: "#555",
    fontSize: 16,
    lineHeight: 24,
  },

});