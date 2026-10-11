import os
import requests

from dotenv import load_dotenv
from pymongo import MongoClient


# ============================================================
# CONFIGURACIÓN
# ============================================================

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise Exception("No se encontró MONGODB_URI en el archivo .env")


API_URL = "https://onepieceapi.com/api/characters"

PERSONAJES = [
    "Monkey D. Luffy",
    "Roronoa Zoro",
    "Nami",
    "Usopp",
    "Sanji",
    "Tony Tony Chopper",
    "Nico Robin",
    "Franky",
    "Brook",
    "Trafalgar D. Water Law",
    "Saint Figarland Shamrock",
    "Shanks",
    "Saint Figarland Garling",
    "Edward Newgate",
    "Gol D. Roger",
    "Kaido",
    "Charlotte Linlin",
    "Portgas D. Ace",
    "Sabo",
    "Monkey D. Garp",
]

# ============================================================
# CONEXIÓN CON MONGODB
# ============================================================

client = MongoClient(MONGODB_URI)

db = client["onepiece_db"]

collection = db["characters"]


# ============================================================
# FUNCIONES
# ============================================================

def obtener_personaje(nombre):
    """
    Busca un personaje en la API de One Piece por nombre.
    """

    respuesta = requests.get(
        API_URL,
        params={
            "q": nombre,
            "limit": 20,
        },
        timeout=30,
    )

    respuesta.raise_for_status()

    personajes = respuesta.json()

    if not personajes:
        return None

    nombre_buscado = nombre.lower()

    for personaje in personajes:
        nombre_api = personaje.get("name")

        if isinstance(nombre_api, dict):
            nombre_api = (
                nombre_api.get("en")
                or nombre_api.get("romaji")
                or nombre_api.get("jp")
                or ""
            )

        if (
            isinstance(nombre_api, str)
            and nombre_api.lower() == nombre_buscado
        ):
            return personaje

    return personajes[0]


def preparar_documento(personaje):
    """
    Prepara el documento que guardaremos en MongoDB.
    """

    nombre = personaje.get("name")

    if isinstance(nombre, dict):
        nombre_principal = (
            nombre.get("en")
            or nombre.get("romaji")
            or nombre.get("jp")
        )
    else:
        nombre_principal = nombre

    documento = {
        "api_id": personaje.get("id"),

        "name": nombre_principal,

        "name_localized": personaje.get("name"),

        "age": personaje.get("age"),

        "birthday": personaje.get("birthday"),

        "blood_type": personaje.get("blood_type"),

        "height": personaje.get("height"),

        "status": personaje.get("status"),

        "image_url": personaje.get("image_url"),

        "extra_data": personaje.get("extra_data"),

        "bounties": personaje.get("bounties", []),
    }

    return documento


# ============================================================
# SEED
# ============================================================

def ejecutar_seed():

    print("")
    print("========================================")
    print("   SEED DE PERSONAJES DE ONE PIECE")
    print("========================================")
    print("")

    exitosos = 0

    for nombre in PERSONAJES:

        print(f"Buscando: {nombre}...")

        try:

            personaje = obtener_personaje(nombre)

            if not personaje:
                print(
                    f"  ❌ No se encontró: {nombre}"
                )
                continue

            documento = preparar_documento(personaje)

            collection.update_one(
                {
                    "api_id": documento["api_id"]
                },
                {
                    "$set": documento
                },
                upsert=True,
            )

            print(
                f"  ✅ Guardado: {documento['name']}"
            )

            exitosos += 1

        except requests.RequestException as error:

            print(
                f"  ❌ Error consultando la API: {error}"
            )

        except Exception as error:

            print(
                f"  ❌ Error guardando {nombre}: {error}"
            )

    print("")
    print("========================================")
    print(f"Personajes procesados: {exitosos}/10")
    print("========================================")
    print("")


# ============================================================
# EJECUCIÓN
# ============================================================

if __name__ == "__main__":
    ejecutar_seed()