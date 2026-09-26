import { Request, Response } from "express";

import {
    obtenerFrutas,
    obtenerPersonajes,
} from "../services/onePieceService";

export async function buscarPersonajes(
  req: Request,
  res: Response
): Promise<void> {

  try {

    const pagina = Number(req.query.page) || 1;
    const limite = Number(req.query.limit) || 20;

    const busqueda =
      typeof req.query.q === "string"
        ? req.query.q
        : undefined;

    const personajes = await obtenerPersonajes(
      pagina,
      limite,
      busqueda
    );

    res.status(200).json(personajes);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener personajes de One Piece",
    });
  }
}

export async function buscarFrutas(
  req: Request,
  res: Response
): Promise<void> {

  try {

    const pagina = Number(req.query.page) || 1;
    const limite = Number(req.query.limit) || 20;

    const frutas = await obtenerFrutas(
      pagina,
      limite
    );

    res.status(200).json(frutas);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener frutas de One Piece",
    });
  }
}