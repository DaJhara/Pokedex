
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

type Proveedor = "gemini" | "openrouter" | "groq";
type TiempoEspera = 20 | 40 | 80 | 160;

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

const SUGERENCIAS = ["Compara a Pikachu con Luffy"];

const PROVEEDORES: { valor: Proveedor; etiqueta: string }[] = [
  { valor: "gemini", etiqueta: "Gemini" },
  { valor: "openrouter", etiqueta: "OpenRouter" },
  { valor: "groq", etiqueta: "Groq" },
];

const TIEMPOS: TiempoEspera[] = [20, 40, 80, 160];

export default function ChatScreen() {
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);

  const [proveedor, setProveedor] =
    useState<Proveedor>("openrouter");

  const [tiempoEspera, setTiempoEspera] =
    useState<TiempoEspera>(40);

  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "bienvenida",
      rol: "asistente",
      contenido:
        "¡Hola! Pregúntame sobre Pokémon y One Piece. Estoy aquí para ayudarte a conocer tus personajes favoritos.",
    },
  ]);

  const scrollRef = useRef<ScrollView>(null);

  async function enviarPregunta(texto?: string) {
    const consulta = (texto ?? pregunta).trim();

    if (!consulta || cargando) {
      return;
    }

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

    const controlador = new AbortController();

    // Se dejan dos segundos adicionales para recibir el error del backend.
    const temporizador = setTimeout(
      () => controlador.abort(),
      tiempoEspera * 1000 + 2000
    );

    try {
      const response = await fetch(`${CHAT_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          pregunta: consulta,
          proveedor,
          tiempoEspera,
        }),
        signal: controlador.signal,
      });

      const data: RespuestaChat = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "No fue posible procesar la pregunta."
        );
      }

      if (!data.respuesta?.respuesta) {
        throw new Error(
          "El servidor devolvió una respuesta incompleta."
        );
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
      const mensajeError =
        error instanceof Error && error.name === "AbortError"
          ? `La solicitud superó el tiempo de espera de ${tiempoEspera} segundos.`
          : error instanceof Error
            ? error.message
            : "Error de conexión con el chat.";

      setMensajes((actuales) => [
        ...actuales,
        {
          id: `error-${Date.now()}`,
          rol: "asistente",
          contenido: mensajeError,
        },
      ]);
    } finally {
      clearTimeout(temporizador);
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.contenedorChat}>
        <View style={styles.encabezadoChat}>
          <Text style={styles.titulo}>Chat inteligente</Text>

          <Text style={styles.subtitulo}>
            Pregunta sobre Pokémon y One Piece
          </Text>

          <View style={styles.configuracionChat}>
            <View style={styles.configuracionFila}>
              <View style={styles.configuracionGrupo}>
                <Text style={styles.etiquetaConfiguracion}>Servicio IA</Text>
                <View style={styles.opcionesConfiguracion}>
                  {(["gemini", "openrouter", "groq"] as const).map((opcion) => (
                    <TouchableOpacity
                      key={opcion}
                      style={[
                        styles.botonConfiguracion,
                        proveedor === opcion && styles.botonConfiguracionActivo,
                      ]}
                      onPress={() => setProveedor(opcion)}
                      disabled={cargando}
                    >
                      <Text
                        style={[
                          styles.textoConfiguracion,
                          proveedor === opcion && styles.textoConfiguracionActivo,
                        ]}
                      >
                        {opcion === "openrouter"
                          ? "OpenRouter"
                          : opcion === "gemini"
                            ? "Gemini"
                            : "Groq"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.configuracionGrupo}>
                <Text style={styles.etiquetaConfiguracion}>
                  Tiempo de espera máximo
                </Text>
                <View style={styles.opcionesConfiguracion}>
                  {([20, 40, 80, 160] as const).map((segundos) => (
                    <TouchableOpacity
                      key={segundos}
                      style={[
                        styles.botonConfiguracion,
                        tiempoEspera === segundos && styles.botonConfiguracionActivo,
                      ]}
                      onPress={() => setTiempoEspera(segundos)}
                      disabled={cargando}
                    >
                      <Text
                        style={[
                          styles.textoConfiguracion,
                          tiempoEspera === segundos && styles.textoConfiguracionActivo,
                        ]}
                      >
                        {segundos}s
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.conversacion}
          contentContainerStyle={styles.contenidoConversacion}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {mensajes.map((mensaje) => (
            <View
              key={mensaje.id}
              style={[
                styles.filaMensaje,
                mensaje.rol === "usuario"
                  ? styles.filaUsuario
                  : styles.filaAsistente,
              ]}
            >
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
                    styles.textoMensaje,
                    mensaje.rol === "usuario"
                      ? styles.textoUsuario
                      : styles.textoAsistente,
                  ]}
                >
                  {mensaje.contenido}
                </Text>

                {mensaje.entidades &&
                  mensaje.entidades.length > 0 && (
                    <View style={styles.listaEntidades}>
                      {mensaje.entidades.map((entidad, index) => (
                        <View
                          key={`${entidad.nombre}-${index}`}
                          style={styles.tarjetaEntidad}
                        >
                          <Text style={styles.nombreEntidad}>
                            {entidad.nombre}
                          </Text>

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

                {mensaje.fuentes && mensaje.fuentes.length > 0 && (
                  <View style={styles.contenedorFuentes}>
                    <Text style={styles.tituloFuentes}>
                      Contexto consultado
                    </Text>

                    {mensaje.fuentes.map((fuente, index) => (
                      <Text
                        key={`${fuente}-${index}`}
                        style={styles.textoFuente}
                      >
                        • {fuente}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}

          {cargando && (
            <View style={styles.indicadorCarga}>
              <ActivityIndicator size="small" color="#803333" />
              <Text style={styles.textoCarga}>
                Consultando {PROVEEDORES.find(
                  (item) => item.valor === proveedor
                )?.etiqueta} (máximo {tiempoEspera}s)...
              </Text>
            </View>
          )}

          {mensajes.length === 1 && !cargando && (
            <View style={styles.contenedorSugerencias}>
              <Text style={styles.tituloSugerencias}>
                Prueba preguntando:
              </Text>

              {SUGERENCIAS.map((sugerencia) => (
                <TouchableOpacity
                  key={sugerencia}
                  style={styles.botonSugerencia}
                  onPress={() => enviarPregunta(sugerencia)}
                  disabled={cargando}
                  activeOpacity={0.75}
                >
                  <Text style={styles.textoSugerencia}>
                    {sugerencia}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#803333"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.seccionEntrada}>
          <View style={styles.contenedorEntrada}>
            <TextInput
              style={styles.campoPregunta}
              value={pregunta}
              onChangeText={setPregunta}
              placeholder="Escribe tu pregunta..."
              placeholderTextColor="#777777"
              returnKeyType="send"
              onSubmitEditing={() => enviarPregunta()}
              editable={!cargando}
              multiline={false}
              accessibilityLabel="Escribe tu pregunta"
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
              activeOpacity={0.75}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.nota}>
            Pregunta sobre tus personajes favoritos
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: "#803333",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  titulo: {
    color: "#803333",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 5,
  },

  subtitulo: {
    color: "#333333",
    fontSize: 14,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 12,
  },

  contenedorChat: {
    flex: 1,
    backgroundColor: "#f5f2f2",
    borderWidth: 2,
    borderColor: "#222222",
    borderRadius: 12,
    overflow: "hidden",
  },

  encabezadoChat: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#DDDDDD",
    backgroundColor: "#f5f2f2",
  },

  configuracionChat: {
    width: "100%",
    gap: 7,
  },

  etiquetaConfiguracion: {
    color: "#333333",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  opcionesConfiguracion: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
  },

  opcionConfiguracion: {
    borderWidth: 1,
    borderColor: "#BBBBBB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },

  opcionTiempo: {
    minWidth: 55,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBBBBB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },

  opcionConfiguracionActiva: {
    backgroundColor: "#803333",
    borderColor: "#803333",
  },

  textoOpcionConfiguracion: {
    color: "#333333",
    fontSize: 12,
    fontWeight: "600",
  },

  textoOpcionConfiguracionActivo: {
    color: "#FFFFFF",
  },

  conversacion: {
    flex: 1,
  },

  contenidoConversacion: {
    padding: 14,
    paddingBottom: 18,
    flexGrow: 1,
  },

  filaMensaje: {
    width: "100%",
    marginBottom: 12,
  },

  filaUsuario: {
    alignItems: "flex-end",
  },

  filaAsistente: {
    alignItems: "flex-start",
  },

  burbuja: {
    maxWidth: "90%",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#222222",
  },

  burbujaUsuario: {
    backgroundColor: "#6fd3ec",
    borderBottomRightRadius: 4,
  },

  burbujaAsistente: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },

  textoMensaje: {
    fontSize: 15,
    lineHeight: 22,
  },

  textoUsuario: {
    color: "#222222",
  },

  textoAsistente: {
    color: "#222222",
  },

  listaEntidades: {
    marginTop: 10,
  },

  tarjetaEntidad: {
    backgroundColor: "#f5f2f2",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },

  nombreEntidad: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#803333",
    marginBottom: 3,
  },

  tipoEntidad: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555555",
    marginBottom: 5,
  },

  datoEntidad: {
    fontSize: 13,
    color: "#222222",
    lineHeight: 19,
  },

  contenedorFuentes: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DDDDDD",
  },

  tituloFuentes: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#803333",
    marginBottom: 4,
  },

  textoFuente: {
    fontSize: 12,
    color: "#555555",
    marginTop: 2,
  },

  indicadorCarga: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 12,
    padding: 10,
  },

  textoCarga: {
    marginLeft: 8,
    color: "#555555",
    fontSize: 13,
    flexShrink: 1,
  },

  contenedorSugerencias: {
    marginTop: 8,
    marginBottom: 12,
  },

  tituloSugerencias: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#803333",
    marginBottom: 10,
  },

  botonSugerencia: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },

  textoSugerencia: {
    flex: 1,
    color: "#333333",
    fontSize: 13,
    marginRight: 8,
  },

  seccionEntrada: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#DDDDDD",
    backgroundColor: "#f5f2f2",
  },

  contenedorEntrada: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 10,
    padding: 5,
  },

  campoPregunta: {
    flex: 1,
    minHeight: 42,
    maxHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#222222",
  },

  botonEnviar: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#6fd3ec",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 5,
  },

  botonDeshabilitado: {
    opacity: 0.5,
  },

  nota: {
    fontSize: 11,
    color: "#666666",
    textAlign: "center",
    marginTop: 8,
  },

  
configuracionFila: {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  width: "100%",
  marginVertical: 10,
},

configuracionGrupo: {
  flex: 1,
  minWidth: 0,
  gap: 6,
},

botonConfiguracion: {
  paddingHorizontal: 8,
  paddingVertical: 7,
  borderRadius: 8,
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#black",
},

botonConfiguracionActivo: {
  backgroundColor: "#6fd3ec",
  borderColor: "#black",
},

textoConfiguracion: {
  fontSize: 11,
  color: "#333333",
  fontWeight: "500",
},

textoConfiguracionActivo: {
  color: "#FFFFFF",
  fontWeight: "700",
},

});
