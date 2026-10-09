from fastapi import APIRouter, HTTPException

from src.services.onepieceService import obtener_personaje


router = APIRouter(
    prefix="/api/onepiece",
    tags=["One Piece"],
)


@router.get(
    "/{nombre}",
    summary="Buscar un personaje de One Piece",
    description=(
        "Busca un personaje por nombre o coincidencia parcial "
        "en los personajes almacenados en MongoDB."
    ),
    responses={
        200: {
            "description": "Personaje encontrado correctamente."
        },
        404: {
            "description": "Personaje no encontrado."
        },
    },
)
def buscar_personaje(nombre: str):

    personaje = obtener_personaje(nombre)

    if not personaje:
        raise HTTPException(
            status_code=404,
            detail="Personaje de One Piece no encontrado",
        )

    return personaje