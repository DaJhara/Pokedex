
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  DOCENTES_ACTUALIZACION_API_URL,
  DOCENTES_API_URL,
  DOCENTES_CREACION_API_URL,
  DOCENTES_ELIMINACION_API_URL,
} from "../../config/api";

interface Docente {
  id: number;
  nombres: string;
  apellidos: string;
  facultad: string;
  programa: string;
  programa_id?: number;
  correo: string;
  perfil: string | null;
  foto_url: string | null;
}

interface Programa {
  id: number;
  nombre: string;
  descripcion: string;
  facultad_id: number;
  facultad: string;
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
  const [fotosConError, setFotosConError] = useState<number[]>([]);

  // Estados del formulario CRUD
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [docenteEditando, setDocenteEditando] = useState<Docente | null>(
    null
  );
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [programaSeleccionado, setProgramaSeleccionado] =
    useState<Programa | null>(null);
  const [listaProgramasVisible, setListaProgramasVisible] = useState(false);

  const [nombresForm, setNombresForm] = useState("");
  const [apellidosForm, setApellidosForm] = useState("");
  const [correoForm, setCorreoForm] = useState("");
  const [perfilForm, setPerfilForm] = useState("");
  const [fotoForm, setFotoForm] = useState("");
  const [cargandoFormulario, setCargandoFormulario] = useState(false);

  const registrarErrorFoto = (id: number) => {
    setFotosConError((anteriores) =>
      anteriores.includes(id) ? anteriores : [...anteriores, id]
    );
  };

  // Consultar docentes por nombre o apellido
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

    await buscarConTermino(termino);
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

  // Abrir formulario para crear o editar
  const abrirFormulario = async (docente?: Docente) => {
    setError("");
    setDocenteEditando(docente ?? null);
    setProgramaSeleccionado(null);
    setListaProgramasVisible(false);

    setNombresForm(docente?.nombres ?? "");
    setApellidosForm(docente?.apellidos ?? "");
    setCorreoForm(docente?.correo ?? "");
    setPerfilForm(docente?.perfil ?? "");
    setFotoForm(docente?.foto_url ?? "");

    try {
      setCargandoFormulario(true);

      const respuesta = await fetch(`${DOCENTES_API_URL}/api/programas`);

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los programas.");
      }

      const datos: Programa[] = await respuesta.json();
      setProgramas(datos);

      if (docente) {
        const programaActual =
          datos.find(
            (programa) => programa.id === docente.programa_id
          ) ??
          datos.find(
            (programa) =>
              programa.nombre.trim().toLowerCase() ===
              docente.programa.trim().toLowerCase()
          );

        if (programaActual) {
          setProgramaSeleccionado(programaActual);
        }
      }

      setFormularioVisible(true);
    } catch {
      Alert.alert(
        "Error",
        "No fue posible cargar los programas académicos. Inténtalo nuevamente."
      );
    } finally {
      setCargandoFormulario(false);
    }
  };

  const cerrarFormulario = () => {
    if (cargandoFormulario) return;

    setFormularioVisible(false);
    setDocenteEditando(null);
    setProgramaSeleccionado(null);
    setListaProgramasVisible(false);
  };

  // Actualizar los resultados tras crear, editar o eliminar
  const actualizarResultados = async () => {
    const termino = busqueda.trim();

    if (!termino) {
      setDocentes([]);
      setHaBuscado(false);
      setError("");
      return;
    }

    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch(
        `${DOCENTES_API_URL}/api/docentes?nombre=${encodeURIComponent(
          termino
        )}`
      );

      if (!respuesta.ok) {
        throw new Error("No fue posible actualizar los resultados.");
      }

      const datos: Docente[] = await respuesta.json();
      setDocentes(datos);
      setHaBuscado(true);
    } catch {
      setError(
        "La operación se realizó, pero no pudimos actualizar los resultados. Intenta buscar nuevamente."
      );
    } finally {
      setCargando(false);
    }
  };

  // Crear o actualizar docente
  const guardarDocente = async () => {
    Keyboard.dismiss();

    if (
      !nombresForm.trim() ||
      !apellidosForm.trim() ||
      !correoForm.trim()
    ) {
      Alert.alert(
        "Campos obligatorios",
        "Completa los nombres, los apellidos y el correo electrónico."
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoForm.trim())) {
      Alert.alert(
        "Correo inválido",
        "Escribe una dirección de correo válida."
      );
      return;
    }

    if (!programaSeleccionado) {
      Alert.alert(
        "Programa obligatorio",
        "Selecciona un programa académico."
      );
      return;
    }

    const datosDocente = {
      nombres: nombresForm.trim(),
      apellidos: apellidosForm.trim(),
      correo: correoForm.trim(),
      perfil: perfilForm.trim() || null,
      foto_url: fotoForm.trim() || null,
      programa_id: programaSeleccionado.id,
    };

    const editando = Boolean(docenteEditando);

    const url = editando
      ? `${DOCENTES_ACTUALIZACION_API_URL}/api/docentes/${docenteEditando!.id}`
      : `${DOCENTES_CREACION_API_URL}/api/docentes`;

    try {
      setCargandoFormulario(true);

      const respuesta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(datosDocente),
      });

      if (!respuesta.ok) {
        const detalle = await respuesta.text();

        throw new Error(
          detalle ||
            `El servidor respondió con código ${respuesta.status}.`
        );
      }

      setFormularioVisible(false);
      setDocenteEditando(null);
      setListaProgramasVisible(false);

      Alert.alert(
        "Operación exitosa",
        editando
          ? "Los datos del docente fueron actualizados."
          : "El docente fue registrado correctamente."
      );

      await actualizarResultados();
    } catch (error) {
      Alert.alert(
        "No se pudo guardar",
        error instanceof Error
          ? error.message
          : "Verifica la conexión e inténtalo nuevamente."
      );
    } finally {
      setCargandoFormulario(false);
    }
  };

  // Confirmación de eliminación para web y móvil
  const confirmarEliminar = (docente: Docente) => {
    const mensaje = `¿Estás seguro de que deseas eliminar a ${docente.nombres} ${docente.apellidos}?`;

    if (Platform.OS === "web") {
      const confirmado =
        typeof window !== "undefined" &&
        window.confirm(`Eliminar docente\n\n${mensaje}`);

      if (confirmado) {
        void eliminarDocente(docente);
      }

      return;
    }

    Alert.alert("Eliminar docente", mensaje, [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void eliminarDocente(docente);
        },
      },
    ]);
  };

  const eliminarDocente = async (docente: Docente) => {
    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch(
        `${DOCENTES_ELIMINACION_API_URL}/api/docentes/${docente.id}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!respuesta.ok) {
        const detalle = await respuesta.text();

        throw new Error(
          detalle ||
            `El servidor respondió con código ${respuesta.status}.`
        );
      }

      setDocentes((anteriores) =>
        anteriores.filter((item) => item.id !== docente.id)
      );

      if (docenteSeleccionado?.id === docente.id) {
        setDocenteSeleccionado(null);
      }

      await actualizarResultados();

      Alert.alert(
        "Operación exitosa",
        "El docente fue eliminado correctamente."
      );
    } catch (error) {
      Alert.alert(
        "No se pudo eliminar",
        error instanceof Error
          ? error.message
          : "Verifica la conexión e inténtalo nuevamente."
      );
    } finally {
      setCargando(false);
    }
  };

  // Formulario modal para crear y editar docentes
  const formularioCRUD = (
    <Modal
      visible={formularioVisible}
      animationType="slide"
      transparent
      onRequestClose={cerrarFormulario}
    >
      <View style={styles.fondoModal}>
        <View style={styles.contenedorModal}>
          <View style={styles.encabezadoModal}>
            <Text style={styles.tituloModal}>
              {docenteEditando ? "Editar docente" : "Agregar docente"}
            </Text>

            <TouchableOpacity
              onPress={cerrarFormulario}
              disabled={cargandoFormulario}
              accessibilityLabel="Cerrar formulario"
            >
              <Ionicons
                name="close-circle"
                size={28}
                color="#803333"
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            <Text style={styles.etiquetaFormulario}>Nombres *</Text>
            <TextInput
              style={styles.inputFormulario}
              value={nombresForm}
              onChangeText={setNombresForm}
              placeholder="Nombres del docente"
              placeholderTextColor="#777"
              editable={!cargandoFormulario}
            />

            <Text style={styles.etiquetaFormulario}>Apellidos *</Text>
            <TextInput
              style={styles.inputFormulario}
              value={apellidosForm}
              onChangeText={setApellidosForm}
              placeholder="Apellidos del docente"
              placeholderTextColor="#777"
              editable={!cargandoFormulario}
            />

            <Text style={styles.etiquetaFormulario}>
              Correo electrónico *
            </Text>
            <TextInput
              style={styles.inputFormulario}
              value={correoForm}
              onChangeText={setCorreoForm}
              placeholder="docente@uninpahu.edu.co"
              placeholderTextColor="#777"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!cargandoFormulario}
            />

            <Text style={styles.etiquetaFormulario}>
              Programa académico *
            </Text>

            {/* Selector sencillo de programas */}
            <TouchableOpacity
              style={styles.selectorPrograma}
              onPress={() =>
                setListaProgramasVisible((visible) => !visible)
              }
              disabled={cargandoFormulario}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar programa académico"
            >
              <Text
                style={[
                  styles.textoSelectorPrograma,
                  !programaSeleccionado &&
                    styles.textoSelectorProgramaPlaceholder,
                ]}
                numberOfLines={1}
              >
                {programaSeleccionado
                  ? programaSeleccionado.nombre
                  : "Selecciona un programa académico"}
              </Text>

              <Ionicons
                name={
                  listaProgramasVisible
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={20}
                color="#803333"
              />
            </TouchableOpacity>

            {listaProgramasVisible && (
              <View style={styles.listaProgramasDesplegable}>
                {programas.length > 0 ? (
                  <ScrollView
                    style={styles.scrollListaProgramas}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {programas.map((programa) => (
                      <TouchableOpacity
                        key={programa.id}
                        style={styles.opcionProgramaDesplegable}
                        onPress={() => {
                          setProgramaSeleccionado(programa);
                          setListaProgramasVisible(false);
                        }}
                        disabled={cargandoFormulario}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.textoOpcionPrograma}>
                          {programa.nombre}
                        </Text>

                        <Text style={styles.facultadOpcionPrograma}>
                          {programa.facultad}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.mensajeProgramas}>
                    No hay programas académicos disponibles.
                  </Text>
                )}
              </View>
            )}

            <Text style={styles.etiquetaFormulario}>
              Perfil profesional (opcional)
            </Text>
            <TextInput
              style={[
                styles.inputFormulario,
                styles.inputMultilinea,
              ]}
              value={perfilForm}
              onChangeText={setPerfilForm}
              placeholder="Información del perfil profesional"
              placeholderTextColor="#777"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!cargandoFormulario}
            />

            <Text style={styles.etiquetaFormulario}>
              URL de la foto (opcional)
            </Text>
            <TextInput
              style={styles.inputFormulario}
              value={fotoForm}
              onChangeText={setFotoForm}
              placeholder="https://ejemplo.com/foto.jpg"
              placeholderTextColor="#777"
              autoCapitalize="none"
              keyboardType="url"
              editable={!cargandoFormulario}
            />

            <TouchableOpacity
              style={styles.botonGuardar}
              onPress={() => void guardarDocente()}
              disabled={cargandoFormulario}
              activeOpacity={0.8}
            >
              {cargandoFormulario ? (
                <ActivityIndicator size="small" color="#222" />
              ) : (
                <>
                  <Ionicons
                    name="save-outline"
                    size={19}
                    color="#222"
                  />
                  <Text style={styles.textoBoton}>
                    {docenteEditando
                      ? "Guardar cambios"
                      : "Registrar docente"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonCancelarFormulario}
              onPress={cerrarFormulario}
              disabled={cargandoFormulario}
              activeOpacity={0.8}
            >
              <Text style={styles.textoBoton}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Ficha completa del docente
  if (docenteSeleccionado) {
    const mostrarFotoPerfil =
      Boolean(docenteSeleccionado.foto_url) &&
      !fotosConError.includes(docenteSeleccionado.id);

    return (
      <View style={styles.contenedor}>
        {formularioCRUD}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contenido}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.marco}>
            <View style={styles.perfilEncabezado}>
              <View style={styles.imagenPerfil}>
                {mostrarFotoPerfil ? (
                  <Image
                    source={{ uri: docenteSeleccionado.foto_url! }}
                    style={styles.fotoPerfil}
                    resizeMode="cover"
                    onError={() =>
                      registrarErrorFoto(docenteSeleccionado.id)
                    }
                    accessibilityLabel={`Foto de ${docenteSeleccionado.nombres} ${docenteSeleccionado.apellidos}`}
                  />
                ) : (
                  <Ionicons
                    name="person"
                    size={43}
                    color="#6fd3ec"
                  />
                )}
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
      {formularioCRUD}

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
                underlineColorAndroid="transparent"
                selectionColor="#803333"
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

          <TouchableOpacity
            style={styles.botonAgregar}
            onPress={() => void abrirFormulario()}
            disabled={cargandoFormulario}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person-add-outline"
              size={19}
              color="#222"
            />
            <Text style={styles.textoBoton}>Agregar docente</Text>
          </TouchableOpacity>

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

              {docentes.map((docente) => {
                const mostrarFoto =
                  Boolean(docente.foto_url) &&
                  !fotosConError.includes(docente.id);

                return (
                  <View key={docente.id} style={styles.tarjeta}>
                    <View style={styles.encabezadoTarjeta}>
                      <View style={styles.iconoDocente}>
                        {mostrarFoto ? (
                          <Image
                            source={{ uri: docente.foto_url! }}
                            style={styles.fotoDocente}
                            resizeMode="cover"
                            onError={() =>
                              registrarErrorFoto(docente.id)
                            }
                            accessibilityLabel={`Foto de ${docente.nombres} ${docente.apellidos}`}
                          />
                        ) : (
                          <Ionicons
                            name="person"
                            size={28}
                            color="#6fd3ec"
                          />
                        )}
                      </View>

                      <View style={styles.datosPrincipales}>
                        <Text style={styles.nombreDocente}>
                          {docente.nombres} {docente.apellidos}
                        </Text>

                        <Text style={styles.facultad}>
                          {docente.facultad}
                        </Text>
                      </View>

                      <View style={styles.accionesTarjeta}>
                        <TouchableOpacity
                          style={styles.botonAccion}
                          onPress={() =>
                            void abrirFormulario(docente)
                          }
                          activeOpacity={0.7}
                          accessibilityLabel={`Editar a ${docente.nombres} ${docente.apellidos}`}
                        >
                          <Ionicons
                            name="create-outline"
                            size={21}
                            color="#803333"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.botonAccion}
                          onPress={() => confirmarEliminar(docente)}
                          activeOpacity={0.7}
                          accessibilityLabel={`Eliminar a ${docente.nombres} ${docente.apellidos}`}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={21}
                            color="#803333"
                          />
                        </TouchableOpacity>
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
                );
              })}

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

  contenido: {
    padding: 14,
    paddingBottom: 24,
    flexGrow: 1,
  },

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

  // Se quitaron las propiedades outline incompatibles con TextStyle.
  input: {
    flex: 1,
    color: "#222",
    fontSize: 14,
    paddingVertical: 9,
    paddingHorizontal: 5,
    borderWidth: 0,
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
    overflow: "hidden",
  },

  fotoDocente: {
    width: "100%",
    height: "100%",
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

  accionesTarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  botonAccion: {
    width: 34,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f2f2",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 9,
  },

  botonAgregar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    backgroundColor: "#6fd3ec",
    borderWidth: 1.5,
    borderColor: "#222",
    borderRadius: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
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
    overflow: "hidden",
  },

  fotoPerfil: {
    width: "100%",
    height: "100%",
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

  // Estilos del formulario CRUD
  fondoModal: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 16,
  },

  contenedorModal: {
    maxHeight: "90%",
    backgroundColor: "#f5f2f2",
    borderWidth: 2,
    borderColor: "#222",
    borderRadius: 18,
    padding: 16,
  },

  encabezadoModal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  tituloModal: {
    color: "#803333",
    fontSize: 21,
    fontWeight: "bold",
    flex: 1,
  },

  etiquetaFormulario: {
    color: "#803333",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
  },

  inputFormulario: {
    minHeight: 44,
    backgroundColor: "#fff",
    color: "#222",
    borderWidth: 1.3,
    borderColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 14,
  },

  inputMultilinea: {
    minHeight: 90,
  },

  // Selector sencillo: una lista de filas, sin tarjetas ni radios.
  selectorPrograma: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1.3,
    borderColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 8,
  },

  textoSelectorPrograma: {
    flex: 1,
    color: "#222",
    fontSize: 14,
  },

  textoSelectorProgramaPlaceholder: {
    color: "#777",
  },

  listaProgramasDesplegable: {
    marginTop: 3,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    overflow: "hidden",
  },

  scrollListaProgramas: {
    maxHeight: 180,
  },

  opcionProgramaDesplegable: {
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  textoOpcionPrograma: {
    color: "#222",
    fontSize: 14,
  },

  facultadOpcionPrograma: {
    color: "#777",
    fontSize: 12,
    marginTop: 2,
  },

  mensajeProgramas: {
    color: "#555",
    fontSize: 13,
    paddingHorizontal: 11,
    paddingVertical: 12,
  },

  botonGuardar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    backgroundColor: "#6fd3ec",
    borderWidth: 1.5,
    borderColor: "#222",
    borderRadius: 10,
    marginTop: 20,
    padding: 10,
  },

  botonCancelarFormulario: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    backgroundColor: "#fff",
    borderWidth: 1.2,
    borderColor: "#222",
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 5,
  },
});