import React, { useCallback, useEffect, useState } from "react";

import {
    ActivityIndicator,
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { DOCENTES_API_URL } from "../../config/api";

interface Docente {
  id: number;
  nombres: string;
  apellidos: string;
  facultad: string;
  programa: string;
  correo: string;
  perfil: string | null;
}

export default function DocentesScreen() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [nombre, setNombre] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDocentes = useCallback(async (termino = "") => {
    try {
      setCargando(true);
      setError("");

      const parametro = termino.trim()
        ? `?nombre=${encodeURIComponent(termino.trim())}`
        : "";

      const respuesta = await fetch(
        `${DOCENTES_API_URL}/api/docentes${parametro}`
      );

      if (!respuesta.ok) {
        throw new Error("No fue posible consultar los docentes.");
      }

      const datos: Docente[] = await respuesta.json();
      setDocentes(datos);
    } catch (e) {
      setDocentes([]);
      setError(
        "No pudimos cargar los docentes. Verifica tu conexión e inténtalo nuevamente."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDocentes();
  }, [cargarDocentes]);

  const buscarDocentes = () => {
    Keyboard.dismiss();
    setBusqueda(nombre.trim());
    cargarDocentes(nombre);
  };

  const limpiarBusqueda = () => {
    setNombre("");
    setBusqueda("");
    cargarDocentes();
  };

  return (
    <View style={styles.contenedor}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.titulo}>Docentes UNINPAHU</Text>

        <Text style={styles.subtitulo}>
          Consulta la información académica de los docentes.
        </Text>

        <View style={styles.busquedaContenedor}>
          <Ionicons
            name="search-outline"
            size={21}
            color="#222"
          />

          <TextInput
            style={styles.input}
            placeholder="Buscar por nombre o apellido"
            placeholderTextColor="#666"
            value={nombre}
            onChangeText={setNombre}
            onSubmitEditing={buscarDocentes}
            returnKeyType="search"
            accessibilityLabel="Buscar docentes por nombre o apellido"
          />

          {nombre.length > 0 && (
            <TouchableOpacity
              onPress={limpiarBusqueda}
              accessibilityLabel="Limpiar búsqueda"
            >
              <Ionicons
                name="close-circle"
                size={21}
                color="#803333"
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.botonBuscar}
          onPress={buscarDocentes}
          disabled={cargando}
          activeOpacity={0.8}
        >
          <Ionicons
            name="search"
            size={19}
            color="#222"
          />
          <Text style={styles.textoBoton}>Buscar docentes</Text>
        </TouchableOpacity>

        <View style={styles.encabezadoResultados}>
          <Text style={styles.tituloResultados}>
            {busqueda ? "Resultados de búsqueda" : "Directorio docente"}
          </Text>

          {!cargando && !error && (
            <Text style={styles.contador}>
              {docentes.length} {docentes.length === 1 ? "docente" : "docentes"}
            </Text>
          )}
        </View>

        {cargando ? (
          <View style={styles.estado}>
            <ActivityIndicator size="large" color="#cae725" />
            <Text style={styles.textoEstado}>
              Consultando docentes...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.estado}>
            <Ionicons
              name="cloud-offline-outline"
              size={42}
              color="#cae725"
            />

            <Text style={styles.textoEstado}>{error}</Text>

            <TouchableOpacity
              style={styles.botonReintentar}
              onPress={() => cargarDocentes(busqueda)}
              activeOpacity={0.8}
            >
              <Text style={styles.textoBoton}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : docentes.length === 0 ? (
          <View style={styles.estado}>
            <Ionicons
              name="people-outline"
              size={44}
              color="#cae725"
            />

            <Text style={styles.textoEstado}>
              No se encontraron docentes.
            </Text>

            <Text style={styles.textoAyuda}>
              Intenta con otro nombre o apellido.
            </Text>

            {busqueda !== "" && (
              <TouchableOpacity
                style={styles.botonReintentar}
                onPress={limpiarBusqueda}
                activeOpacity={0.8}
              >
                <Text style={styles.textoBoton}>
                  Ver todos los docentes
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.lista}>
            {docentes.map((docente) => (
              <View
                key={docente.id}
                style={styles.tarjeta}
              >
                <View style={styles.encabezadoTarjeta}>
                  <View style={styles.iconoDocente}>
                    <Ionicons
                      name="person"
                      size={28}
                      color="#cae725"
                    />
                  </View>

                  <View style={styles.datosPrincipales}>
                    <Text style={styles.nombreDocente}>
                      {docente.nombres} {docente.apellidos}
                    </Text>

                    <Text style={styles.facultad}>
                      {docente.facultad}
                    </Text>
                  </View>
                </View>

                <View style={styles.separador} />

                <View style={styles.filaDato}>
                  <Ionicons
                    name="school-outline"
                    size={19}
                    color="#803333"
                  />
                  <View style={styles.textosDato}>
                    <Text style={styles.etiqueta}>Programa académico</Text>
                    <Text style={styles.valor}>{docente.programa}</Text>
                  </View>
                </View>

                <View style={styles.filaDato}>
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color="#803333"
                  />
                  <View style={styles.textosDato}>
                    <Text style={styles.etiqueta}>Correo electrónico</Text>
                    <Text style={styles.valor}>{docente.correo}</Text>
                  </View>
                </View>

                {docente.perfil ? (
                  <View style={styles.filaDato}>
                    <Ionicons
                      name="information-circle-outline"
                      size={19}
                      color="#803333"
                    />
                    <View style={styles.textosDato}>
                      <Text style={styles.etiqueta}>Perfil</Text>
                      <Text style={styles.valor}>{docente.perfil}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#803333",
  },
  scroll: {
    flex: 1,
  },
  contenido: {
    padding: 18,
    paddingBottom: 30,
  },
  titulo: {
    color: "#cae725",
    fontSize: 27,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 12,
  },
  subtitulo: {
    color: "#f5f2f2",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 21,
  },
  busquedaContenedor: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f2f2",
    borderColor: "#222",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 49,
  },
  input: {
    flex: 1,
    color: "#222",
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 9,
  },
  botonBuscar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6fd3ec",
    borderColor: "#222",
    borderWidth: 1.5,
    borderRadius: 10,
    minHeight: 45,
    marginTop: 10,
  },
  textoBoton: {
    color: "#222",
    fontSize: 15,
    fontWeight: "bold",
  },
  encabezadoResultados: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 25,
    marginBottom: 12,
  },
  tituloResultados: {
    color: "#cae725",
    fontSize: 18,
    fontWeight: "bold",
    flexShrink: 1,
  },
  contador: {
    color: "#f5f2f2",
    fontSize: 12,
  },
  estado: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 35,
    paddingHorizontal: 12,
    gap: 12,
  },
  textoEstado: {
    color: "#f5f2f2",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  textoAyuda: {
    color: "#f5f2f2",
    fontSize: 13,
    textAlign: "center",
  },
  botonReintentar: {
    backgroundColor: "#6fd3ec",
    borderColor: "#222",
    borderWidth: 1.5,
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 5,
  },
  lista: {
    gap: 15,
  },
  tarjeta: {
    backgroundColor: "#f5f2f2",
    borderColor: "#222",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 15,
  },
  encabezadoTarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconoDocente: {
    width: 53,
    height: 53,
    borderRadius: 27,
    backgroundColor: "#803333",
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  datosPrincipales: {
    flex: 1,
  },
  nombreDocente: {
    color: "#803333",
    fontSize: 17,
    fontWeight: "bold",
  },
  facultad: {
    color: "#444",
    fontSize: 13,
    marginTop: 4,
  },
  separador: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 14,
  },
  filaDato: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 13,
  },
  textosDato: {
    flex: 1,
  },
  etiqueta: {
    color: "#666",
    fontSize: 12,
    marginBottom: 3,
  },
  valor: {
    color: "#222",
    fontSize: 14,
    lineHeight: 20,
  },
});