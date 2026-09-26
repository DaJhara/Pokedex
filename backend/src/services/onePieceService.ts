import {
    DevilFruit,
    OnePieceCharacter,
} from "../types/onePiece";

const ONE_PIECE_API_URL =
  "https://onepieceapi.com/api";

export async function obtenerPersonajes(
  pagina: number = 1,
  limite: number = 20,
  busqueda?: string
): Promise<OnePieceCharacter[]> {

  const parametros = new URLSearchParams();

  parametros.append("page", pagina.toString());
  parametros.append("limit", limite.toString());

  if (busqueda?.trim()) {
    parametros.append("q", busqueda.trim());
  }

  const respuesta = await fetch(
    `${ONE_PIECE_API_URL}/characters?${parametros.toString()}`
  );

  if (!respuesta.ok) {
    throw new Error("No se pudieron obtener los personajes");
  }

  return await respuesta.json();
}

export async function obtenerFrutas(
  pagina: number = 1,
  limite: number = 20
): Promise<DevilFruit[]> {

  const respuesta = await fetch(
    `${ONE_PIECE_API_URL}/devil-fruits?page=${pagina}&limit=${limite}`
  );

  if (!respuesta.ok) {
    throw new Error("No se pudieron obtener las frutas");
  }

  return await respuesta.json();
}