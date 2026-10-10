
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
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
  const [docenteSeleccionado, setDocenteSeleccionado] =
    useState<Docente | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [haBuscado, setHaBuscado] = useState(false);

  const buscarDocentes = async () => {
    const termino = nombre.trim();

    Keyboard.dismiss();
    setDocenteSeleccionado(null);
    setBusqueda(termino);
    setError("");
    setDocentes([]);
    setHaBuscado(true);

    if (!termino) {
      setError("Escribe el nombre o apellido de un docente para buscar.");
      return;
    }

    try {
      setCargando(true);

      const respuesta = await fetch(
        `${DOCENTES_API_URL}/api/docentes?nombre=${encodeURIComponent(
          termino
        )}`
      );

      if (!respuesta.ok) {
        throw new Error("No fue posible consultar los docentes.");
      }

      const datos: Docente[] = await respuesta.json();
      setDocentes(datos);
    } catch {
      setError(
        "No pudimos consultar los docentes. Verifica tu conexión e inténtalo nuevamente."
      );
    } finally {
      setCargando(false);
    }
  };

  const limpiarBusqueda = () => {
    setNombre("");
    setBusqueda("");
    setDocentes([]);
    setError("");
    setDocenteSeleccionado(null);
    setHaBuscado(false);
    Keyboard.dismiss();
  };

  const reintentarBusqueda = () => {
    setNombre(busqueda);
    void buscarConTermino(busqueda);
  };

  const buscarConTermino = async (terminoOriginal: string) => {
    const termino = terminoOriginal.trim();

    if (!termino) {
      setError("Escribe el nombre o apellido de un docente para buscar.");
      return;
    }

    try {
      setCargando(true);
      setError("");
      setDocentes([]);
      setDocenteSeleccionado(null);
      setBusqueda(termino);
      setHaBuscado(true);

      const respuesta = await fetch(
        `${DOCENTES_API_URL}/api/docentes?nombre=${encodeURIComponent(
          termino
        )}`
      );

      if (!respuesta.ok) {
        throw new Error("No fue posible consultar los docentes.");
      }

      const datos: Docente[] = await respuesta.json();
      setDocentes(datos);
    } catch {
      setError(
        "No pudimos consultar los docentes. Verifica tu conexión e inténtalo nuevamente."
      );
    } finally {
      setCargando(false);
    }
  };

  // Ficha completa del docente
  if (docenteSeleccionado) {
    return (
      <View style={styles.contenedor}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contenido}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.marco}>
            <View style={styles.perfilEncabezado}>
              <View style={styles.imagenPerfil}>
                <Ionicons name="person" size={43} color="#6fd3ec" />
              </View>

              <Text style={styles.nombrePerfil}>
                {docenteSeleccionado.nombres}{" "}
                {docenteSeleccionado.apellidos}
              </Text>

              <Text style={styles.facultadPerfil}>
                {docenteSeleccionado.facultad}
              </Text>
            </View>

            <View style={styles.tituloDetalleContenedor}>
              <Text style={styles.tituloDetalle}>Perfil completo</Text>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="#803333"
              />
            </View>

            <ScrollView
              style={styles.scrollPerfil}
              contentContainerStyle={styles.contenidoPerfil}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <DatoPerfil
                icono="person-outline"
                etiqueta="Nombre completo"
                valor={`${docenteSeleccionado.nombres} ${docenteSeleccionado.apellidos}`}
              />

              <DatoPerfil
                icono="business-outline"
                etiqueta="Facultad"
                valor={docenteSeleccionado.facultad}
              />

              <DatoPerfil
                icono="school-outline"
                etiqueta="Programa académico"
                valor={docenteSeleccionado.programa}
              />

              <DatoPerfil
                icono="mail-outline"
                etiqueta="Correo electrónico"
                valor={docenteSeleccionado.correo}
              />

              <DatoPerfil
                icono="document-text-outline"
                etiqueta="Perfil profesional"
                valor={
                  docenteSeleccionado.perfil ||
                  "No hay información de perfil registrada."
                }
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.botonRegresar}
              onPress={() => setDocenteSeleccionado(null)}
              activeOpacity={0.8}
              accessibilityLabel="Regresar a los resultados"
            >
              <Ionicons name="arrow-back" size={18} color="#222" />
              <Text style={styles.textoBoton}>Regresar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Pantalla principal de búsqueda
  return (
    <View style={styles.contenedor}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.marco}>
          <Text style={styles.titulo}>Docentes UNINPAHU</Text>

          <Text style={styles.subtitulo}>
            Busca un docente por su nombre o apellido.
          </Text>

          <View style={styles.filaBusqueda}>
            <View style={styles.busquedaContenedor}>
              <Ionicons
                name="search-outline"
                size={20}
                color="#803333"
              />

              <TextInput
                style={styles.input}
                placeholder="Nombre o apellido"
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
              accessibilityLabel="Buscar docentes"
            >
              {cargando ? (
                <ActivityIndicator size="small" color="#222" />
              ) : (
                <Ionicons name="search" size={21} color="#222" />
              )}
            </TouchableOpacity>
          </View>

          {!haBuscado && !cargando && !error && (
            <View style={styles.estadoInicial}>
              <Ionicons
                name="people-outline"
                size={58}
                color="#6fd3ec"
              />

              <Text style={styles.textoEstado}>
                Los resultados aparecerán aquí.
              </Text>

              <Text style={styles.textoAyuda}>
                Escribe un nombre o apellido y pulsa Buscar.
              </Text>
            </View>
          )}

          {cargando && (
            <View style={styles.estado}>
              <ActivityIndicator size="large" color="#cae725" />
              <Text style={styles.textoEstado}>
                Consultando docentes...
              </Text>
            </View>
          )}

          {!cargando && error !== "" && (
            <View style={styles.estado}>
              <Ionicons
                name="alert-circle-outline"
                size={42}
                color="#cae725"
              />

              <Text style={styles.textoEstado}>{error}</Text>

              {busqueda !== "" && (
                <TouchableOpacity
                  style={styles.botonSecundario}
                  onPress={reintentarBusqueda}
                  activeOpacity={0.8}
                >
                  <Text style={styles.textoBoton}>Reintentar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!cargando &&
            !error &&
            haBuscado &&
            docentes.length === 0 && (
              <View style={styles.estado}>
                <Ionicons
                  name="person-remove-outline"
                  size={42}
                  color="#cae725"
                />

                <Text style={styles.textoEstado}>
                  No se encontraron docentes para “{busqueda}”.
                </Text>

                <Text style={styles.textoAyuda}>
                  Comprueba el nombre o intenta con un apellido.
                </Text>
              </View>
            )}

          {!cargando && !error && docentes.length > 0 && (
            <View style={styles.resultados}>
              <Text style={styles.tituloResultados}>
                {docentes.length === 1
                  ? "Docente encontrado"
                  : `${docentes.length} docentes encontrados`}
              </Text>

              {docentes.map((docente) => (
                <View key={docente.id} style={styles.tarjeta}>
                  <View style={styles.encabezadoTarjeta}>
                    <View style={styles.iconoDocente}>
                      <Ionicons
                        name="person"
                        size={28}
                        color="#6fd3ec"
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

                  <DatoResumen
                    icono="school-outline"
                    etiqueta="Programa académico"
                    valor={docente.programa}
                  />

                  <DatoResumen
                    icono="mail-outline"
                    etiqueta="Correo electrónico"
                    valor={docente.correo}
                  />

                  <TouchableOpacity
                    style={styles.botonVerMas}
                    onPress={() => setDocenteSeleccionado(docente)}
                    activeOpacity={0.8}
                    accessibilityLabel={`Ver perfil de ${docente.nombres} ${docente.apellidos}`}
                  >
                    <Text style={styles.textoVerMas}>Ver más</Text>

                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color="#222"
                    />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.botonLimpiar}
                onPress={limpiarBusqueda}
                activeOpacity={0.8}
              >
                <Text style={styles.textoBoton}>Nueva búsqueda</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Datos resumidos de cada docente
function DatoResumen({
  icono,
  etiqueta,
  valor,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  etiqueta: string;
  valor: string;
}) {
  return (
    <View style={styles.filaDato}>
      <Ionicons name={icono} size={19} color="#803333" />

      <View style={styles.textosDato}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        <Text style={styles.valor}>{valor}</Text>
      </View>
    </View>
  );
}

// Datos del perfil completo
function DatoPerfil({
  icono,
  etiqueta,
  valor,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  etiqueta: string;
  valor: string;
}) {
  return (
    <View style={styles.datoPerfil}>
      <View style={styles.iconoDatoPerfil}>
        <Ionicons name={icono} size={20} color="#803333" />
      </View>

      <View style={styles.textosDato}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        <Text style={styles.valor}>{valor}</Text>
      </View>
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

  // Márgenes compartidos por la búsqueda y la ficha
  contenido: {
    padding: 14,
    paddingBottom: 24,
    flexGrow: 1,
  },

  // Marco interior de ambas pantallas
  marco: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#222",
    borderRadius: 18,
    backgroundColor: "#f5f2f2",
    padding: 12,
    minHeight: 470,
  },

  titulo: {
    color: "#803333",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 5,
  },

  subtitulo: {
    color: "#333",
    fontSize: 14,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 16,
  },

  filaBusqueda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  busquedaContenedor: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#222",
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 10,
  },

  input: {
    flex: 1,
    color: "#222",
    fontSize: 14,
    paddingVertical: 9,
    paddingHorizontal: 5,
  },

  botonBuscar: {
    width: 50,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6fd3ec",
    borderColor: "#222",
    borderWidth: 1.5,
    borderRadius: 12,
  },

  textoBoton: {
    color: "#222",
    fontSize: 14,
    fontWeight: "bold",
  },

  estadoInicial: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: 12,
  },

  estado: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    paddingHorizontal: 12,
    gap: 12,
  },

  textoEstado: {
    color: "#222",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  textoAyuda: {
    color: "#444",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  resultados: {
    marginTop: 17,
    gap: 12,
  },

  tituloResultados: {
    color: "#803333",
    fontSize: 17,
    fontWeight: "bold",
  },

  tarjeta: {
    backgroundColor: "#fff",
    borderColor: "#222",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 13,
  },

  encabezadoTarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  iconoDocente: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#803333",
    borderWidth: 1.5,
    borderColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },

  datosPrincipales: {
    flex: 1,
  },

  nombreDocente: {
    color: "#803333",
    fontSize: 16,
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
    marginVertical: 12,
  },

  filaDato: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginBottom: 11,
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

  botonVerMas: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6fd3ec",
    borderWidth: 1.5,
    borderColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 3,
  },

  textoVerMas: {
    color: "#222",
    fontSize: 13,
    fontWeight: "bold",
  },

  botonLimpiar: {
    alignSelf: "center",
    backgroundColor: "#6fd3ec",
    borderWidth: 1.5,
    borderColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 4,
    marginBottom: 8,
  },

  botonSecundario: {
    backgroundColor: "#6fd3ec",
    borderWidth: 1.5,
    borderColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },

  perfilEncabezado: {
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 15,
  },

  imagenPerfil: {
    width: 82,
    height: 82,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#00a6ed",
    backgroundColor: "#fff",
    marginBottom: 9,
  },

  nombrePerfil: {
    color: "#803333",
    fontSize: 19,
    fontWeight: "bold",
    textAlign: "center",
  },

  facultadPerfil: {
    color: "#444",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },

  tituloDetalleContenedor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#222",
    borderRadius: 10,
    padding: 9,
    marginBottom: 8,
  },

  tituloDetalle: {
    color: "#222",
    fontSize: 16,
    fontWeight: "bold",
  },

  scrollPerfil: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#222",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 160,
  },

  contenidoPerfil: {
    padding: 12,
    gap: 15,
  },

  datoPerfil: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  iconoDatoPerfil: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f2f2",
    borderWidth: 1,
    borderColor: "#ccc",
  },

  botonRegresar: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#6fd3ec",
    borderWidth: 1.5,
    borderColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 8,
  },
});