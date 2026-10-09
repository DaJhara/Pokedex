import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";

import { API_URL } from "../config/api";

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;

  sprites: {
    front_default: string | null;
    front_female: string | null;
    front_shiny: string | null;
    front_shiny_female: string | null;
  };

  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];

  moves: {
    move: {
      name: string;
    };
  }[];

  species: {
    name: string;
    url: string;
  };
}

interface PokemonContextType {
  pokemon: Pokemon | null;
  cargando: boolean;
  imagenActual: string | null;
  tieneFormaFemenina: boolean;
  esShiny: boolean;
  mostrarFemenina: boolean;

  buscarPokemon: (nombre: string) => Promise<void>;

  cambiarForma: () => void;
  cambiarShiny: (valor?: boolean) => void;
}

const PokemonContext =
  createContext<PokemonContextType | undefined>(undefined);

interface PokemonProviderProps {
  children: ReactNode;
}

export function PokemonProvider({
  children,
}: PokemonProviderProps) {
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mostrarFemenina, setMostrarFemenina] = useState(false);
  const [mostrarShiny, setMostrarShiny] = useState(false);

  const buscarPokemon = async (nombre: string) => {
    const nombrePokemon = nombre.trim().toLowerCase();

    if (!nombrePokemon) {
      return;
    }

    try {
      setCargando(true);
      setPokemon(null);
      setMostrarFemenina(false);
      setMostrarShiny(false);

      const respuesta = await fetch(
        `${API_URL}/api/pokemon/${encodeURIComponent(nombrePokemon)}`
      );

      if (respuesta.status === 404) {
        throw new Error("Pokémon no encontrado.");
      }

      if (!respuesta.ok) {
        throw new Error(
          `Error del microservicio: ${respuesta.status}`
        );
      }

      const datos: Pokemon = await respuesta.json();

      setPokemon(datos);
    } catch (error) {
      console.error("Error buscando Pokémon:", error);
      setPokemon(null);
    } finally {
      setCargando(false);
    }
  };

  const tieneFormaFemenina =
    pokemon?.sprites?.front_female != null;

  const cambiarForma = () => {
    if (!tieneFormaFemenina) {
      return;
    }

    setMostrarFemenina((valor) => !valor);
  };

  const cambiarShiny = (valor?: boolean) => {
    if (!pokemon?.sprites?.front_shiny) {
      return;
    }

    if (valor !== undefined) {
      setMostrarShiny(valor);
    } else {
      setMostrarShiny((actual) => !actual);
    }
  };

  const obtenerImagen = (): string | null => {
    if (!pokemon) {
      return null;
    }

    if (
      mostrarShiny &&
      mostrarFemenina &&
      pokemon.sprites.front_shiny_female
    ) {
      return pokemon.sprites.front_shiny_female;
    }

    if (
      mostrarShiny &&
      pokemon.sprites.front_shiny
    ) {
      return pokemon.sprites.front_shiny;
    }

    if (
      mostrarFemenina &&
      pokemon.sprites.front_female
    ) {
      return pokemon.sprites.front_female;
    }

    return pokemon.sprites.front_default ?? null;
  };

  return (
    <PokemonContext.Provider
      value={{
        pokemon,
        cargando,
        imagenActual: obtenerImagen(),
        tieneFormaFemenina,
        mostrarFemenina,
        esShiny: mostrarShiny,
        buscarPokemon,
        cambiarForma,
        cambiarShiny,
      }}
    >
      {children}
    </PokemonContext.Provider>
  );
}

export function usePokemon() {
  const context = useContext(PokemonContext);

  if (!context) {
    throw new Error(
      "usePokemon debe utilizarse dentro de PokemonProvider"
    );
  }

  return context;
}