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

  name: NombreLocalizado | null;

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

  guardarPersonaje: (
    personaje: Personaje
  ) => void;

  limpiarPersonaje: () => void;
}

const OnePieceContext =
  createContext<OnePieceContextType | undefined>(
    undefined
  );

interface OnePieceProviderProps {
  children: ReactNode;
}

export function OnePieceProvider({
  children,
}: OnePieceProviderProps) {
  const [personaje, setPersonaje] =
    useState<Personaje | null>(null);

  const guardarPersonaje = (
    nuevoPersonaje: Personaje
  ) => {
    setPersonaje(nuevoPersonaje);
  };

  const limpiarPersonaje = () => {
    setPersonaje(null);
  };

  return (
    <OnePieceContext.Provider
      value={{
        personaje,
        guardarPersonaje,
        limpiarPersonaje,
      }}
    >
      {children}
    </OnePieceContext.Provider>
  );
}

export function useOnePiece() {
  const context = useContext(
    OnePieceContext
  );

  if (!context) {
    throw new Error(
      "useOnePiece debe utilizarse dentro de OnePieceProvider"
    );
  }

  return context;
}