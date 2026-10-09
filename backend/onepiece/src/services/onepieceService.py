from src.config.database import characters_collection


def obtener_personaje(nombre: str):
    nombre_busqueda = nombre.strip()

    personaje = characters_collection.find_one(
        {
            "name": {
                "$regex": nombre_busqueda,
                "$options": "i",
            }
        }
    )

    if not personaje:
        return None

    personaje["_id"] = str(personaje["_id"])

    return personaje