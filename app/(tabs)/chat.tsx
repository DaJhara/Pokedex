
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { CHAT_API_URL } from "../../config/api";

interface Entidad {
  tipo: "pokemon" | "onepiece";
  nombre: string;
  datoClave: string;
}

interface Mensaje {
  id: string;
  rol: "usuario" | "asistente";
  contenido: string;
  entidades?: Entidad[];
  fuentes?: string[];
}

interface RespuestaChat {
  error?: string;
  respuesta?: {
    respuesta: string;
    entidades: Entidad[];
  };
  contextoConsultado?: {
    tipo: string;
    nombre: string;
  }[];
}

const SUGERENCIAS = [
  "¿Qué sabes de Pikachu?",
  "Cuéntame sobre Luffy",
  "Compara a Pikachu con Luffy",
];

export default function ChatScreen() {
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "bienvenida",
      rol: "asistente",
      contenido:
        "¡Hola! Pregúntame sobre Pokémon y One Piece. " +
        "Consultaré los datos disponibles en nuestros servicios.",
    },
  ]);

  const scrollRef = useRef<ScrollView>(null);

  async function enviarPregunta(texto?: string) {
    const consulta = (texto ?? pregunta).trim();

    if (!consulta || cargando) return;

    setMensajes((actuales) => [
      ...actuales,
      {
        id: `usuario-${Date.now()}`,
        rol: "usuario",
        contenido: consulta,
      },
    ]);

    setPregunta("");
    setCargando(true);

    try {
      const response = await fetch(`${CHAT_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ pregunta: consulta }),
      });

      const data: RespuestaChat = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No fue posible procesar la pregunta."
        );
      }

      if (!data.respuesta?.respuesta) {
        throw new Error("El servidor devolvió un JSON incompleto.");
      }

      setMensajes((actuales) => [
        ...actuales,
        {
          id: `asistente-${Date.now()}`,
          rol: "asistente",
          contenido: data.respuesta!.respuesta,
          entidades: data.respuesta!.entidades || [],
          fuentes: (data.contextoConsultado || []).map(
            (item) => `${item.tipo}: ${item.nombre}`
          ),
        },
      ]);
    } catch (error) {
      setMensajes((actuales) => [
        ...actuales,
        {
          id: `error-${Date.now()}`,
          rol: "asistente",
          contenido:
            error instanceof Error
              ? error.message
              : "Error de conexión con el chat.",
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.encabezado}>
        <View style={styles.iconoEncabezado}>
          <Ionicons
            name="chatbubbles"
            size={26}
            color="#FFFFFF"
          />
        </View>

        <View>
          <Text style={styles.titulo}>Chat inteligente</Text>
          <Text style={styles.subtitulo}>
            Pokémon · One Piece
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.conversacion}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {mensajes.map((mensaje) => (
          <View
            key={mensaje.id}
            style={[
              styles.fila,
              mensaje.rol === "usuario"
                ? styles.filaUsuario
                : styles.filaAsistente,
            ]}
          >
            {mensaje.rol === "asistente" && (
              <View style={styles.avatar}>
                <Ionicons
                  name="sparkles"
                  size={17}
                  color="#803333"
                />
              </View>
            )}

            <View
              style={[
                styles.burbuja,
                mensaje.rol === "usuario"
                  ? styles.burbujaUsuario
                  : styles.burbujaAsistente,
              ]}
            >
              <Text
                style={[
                  styles.texto,
                  mensaje.rol === "usuario" && styles.textoUsuario,
                ]}
              >
                {mensaje.contenido}
              </Text>

              {!!mensaje.entidades?.length && (
                <View style={styles.listaEntidades}>
                  {mensaje.entidades.map((entidad, indice) => (
                    <View
                      key={`${entidad.tipo}-${entidad.nombre}-${indice}`}
                      style={styles.tarjeta}
                    >
                      <View style={styles.filaEntidad}>
                        <Ionicons
                          name={
                            entidad.tipo === "pokemon"
                              ? "flash-outline"
                              : "compass-outline"
                          }
                          size={18}
                          color="#803333"
                        />
                        <Text style={styles.nombreEntidad}>
                          {entidad.nombre}
                        </Text>
                      </View>

                      <Text style={styles.tipoEntidad}>
                        {entidad.tipo === "pokemon"
                          ? "Pokémon"
                          : "One Piece"}
                      </Text>

                      <Text style={styles.datoEntidad}>
                        {entidad.datoClave}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {!!mensaje.fuentes?.length && (
                <Text style={styles.fuentes}>
                  Datos consultados: {mensaje.fuentes.join(", ")}
                </Text>
              )}
            </View>
          </View>
        ))}

        {mensajes.length === 1 && (
          <View style={styles.sugerencias}>
            <Text style={styles.tituloSugerencias}>
              Prueba con una pregunta
            </Text>

            {SUGERENCIAS.map((sugerencia) => (
              <TouchableOpacity
                key={sugerencia}
                style={styles.botonSugerencia}
                onPress={() => enviarPregunta(sugerencia)}
                disabled={cargando}
              >
                <Text style={styles.textoSugerencia}>
                  {sugerencia}
                </Text>
                <Ionicons
                  name="arrow-up-outline"
                  size={18}
                  color="#803333"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {cargando && (
          <View style={styles.filaAsistente}>
            <View style={styles.cargando}>
              <ActivityIndicator color="#803333" />
              <Text style={styles.textoCargando}>
                Consultando información...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.contenedorEntrada}>
        <TextInput
          style={styles.entrada}
          value={pregunta}
          onChangeText={setPregunta}
          placeholder="Escribe tu pregunta..."
          placeholderTextColor="#888"
          multiline
          maxLength={1000}
          editable={!cargando}
        />

        <TouchableOpacity
          style={[
            styles.botonEnviar,
            (!pregunta.trim() || cargando) &&
              styles.botonDeshabilitado,
          ]}
          onPress={() => enviarPregunta()}
          disabled={!pregunta.trim() || cargando}
          accessibilityLabel="Enviar pregunta"
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.nota}>
        Respuestas basadas en los datos disponibles.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: "#F7F5F3",
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E2DE",
    gap: 12,
  },
  iconoEncabezado: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#803333",
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#292323",
  },
  subtitulo: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
  },
  conversacion: {
    flex: 1,
  },
  contenido: {
    padding: 15,
    paddingBottom: 24,
    flexGrow: 1,
  },
  fila: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  filaUsuario: {
    justifyContent: "flex-end",
  },
  filaAsistente: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#F0E4E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  burbuja: {
    maxWidth: "86%",
    borderRadius: 17,
    padding: 13,
  },
  burbujaUsuario: {
    backgroundColor: "#803333",
    borderBottomRightRadius: 5,
  },
  burbujaAsistente: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE6E2",
    borderBottomLeftRadius: 5,
  },
  texto: {
    fontSize: 15,
    lineHeight: 22,
    color: "#292323",
  },
  textoUsuario: {
    color: "#FFFFFF",
  },
  listaEntidades: {
    marginTop: 12,
    gap: 9,
  },
  tarjeta: {
    backgroundColor: "#F8F4F1",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E9DFD9",
    padding: 10,
  },
  filaEntidad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  nombreEntidad: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#302525",
  },
  tipoEntidad: {
    fontSize: 11,
    color: "#803333",
    marginTop: 5,
    fontWeight: "600",
  },
  datoEntidad: {
    fontSize: 13,
    lineHeight: 19,
    color: "#514B47",
    marginTop: 5,
  },
  fuentes: {
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#EEE7E2",
    color: "#777",
    fontSize: 10,
    lineHeight: 15,
  },
  sugerencias: {
    marginTop: 15,
    gap: 9,
  },
  tituloSugerencias: {
    fontSize: 14,
    fontWeight: "700",
    color: "#514541",
  },
  botonSugerencia: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5D8D2",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  textoSugerencia: {
    flex: 1,
    fontSize: 13,
    color: "#5B3535",
  },
  cargando: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
  },
  textoCargando: {
    color: "#666",
    fontSize: 13,
  },
  contenedorEntrada: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E2DE",
    gap: 9,
  },
  entrada: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    backgroundColor: "#F7F5F3",
    borderRadius: 23,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 12,
    fontSize: 14,
    color: "#292323",
    borderWidth: 1,
    borderColor: "#E6DEDA",
  },
  botonEnviar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#803333",
    alignItems: "center",
    justifyContent: "center",
  },
  botonDeshabilitado: {
    opacity: 0.45,
  },
  nota: {
    textAlign: "center",
    fontSize: 10,
    color: "#888",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
