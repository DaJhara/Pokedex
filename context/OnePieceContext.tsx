
import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";

interface NombreLocalizado {
  en: string;
  jp: string;
  romaji: string;
}

interface Bounty {
  id: string;
  created_at: string;
  amount: number | null;
  character_id: string | null;
  is_active: boolean;
}

export interface Personaje {
  id: string;
  name: string;
  name_localized: NombreLocalizado | null;
  age: number | null;
  birthday: unknown;
  blood_type: string | null;
  height: number | null;
  status: string | null;
  image_url: string | null;
  extra_data: Record<string, unknown> | null;
  bounties: Bounty[];
}

interface OnePieceContextType {
  personaje: Personaje | null;
  cargando: boolean;
  error: string | null;
  buscarPersonaje: (nombre: string) => Promise<void>;
  guardarPersonaje: (personaje: Personaje) => void;
  limpiarPersonaje: () => void;
}

const OnePieceContext =
  createContext<OnePieceContextType | undefined>(undefined);

interface OnePieceProviderProps {
  children: ReactNode;
}

// Cambia esta URL por el dominio público de tu servicio Python en Railway.
const API_URL = "https://onepiece-production-0d65.up.railway.app";


export function OnePieceProvider({
  children,
}: OnePieceProviderProps) {
  const [personaje, setPersonaje] = useState<Personaje | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarPersonaje = async (nombre: string) => {
    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setError("Escribe el nombre de un personaje.");
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const respuesta = await fetch(
        `${API_URL}/api/onepiece/${encodeURIComponent(nombreLimpio)}`
      );

      if (respuesta.status === 404) {
        setPersonaje(null);
        setError("No se encontró ese personaje.");
        return;
      }

      if (!respuesta.ok) {
        throw new Error("No se pudo consultar el microservicio.");
      }

      const datos: Personaje = await respuesta.json();

      setPersonaje(datos);
    } catch (e) {
      setPersonaje(null);
      setError(
        e instanceof Error
          ? e.message
          : "Ocurrió un error al buscar el personaje."
      );
    } finally {
      setCargando(false);
    }
  };

  const guardarPersonaje = (nuevoPersonaje: Personaje) => {
    setPersonaje(nuevoPersonaje);
    setError(null);
  };

  const limpiarPersonaje = () => {
    setPersonaje(null);
    setError(null);
  };

  return (
    <OnePieceContext.Provider
      value={{
        personaje,
        cargando,
        error,
        buscarPersonaje,
        guardarPersonaje,
        limpiarPersonaje,
      }}
    >
      {children}
    </OnePieceContext.Provider>
  );
}

export function useOnePiece() {
  const context = useContext(OnePieceContext);

  if (!context) {
    throw new Error(
      "useOnePiece debe utilizarse dentro de OnePieceProvider"
    );
  }

  return context;
}