import os

from dotenv import load_dotenv
from pymongo import MongoClient


load_dotenv()


MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise Exception(
        "No se encontró MONGODB_URI en el archivo .env"
    )


client = MongoClient(MONGODB_URI)

db = client["onepiece_db"]

characters_collection = db["characters"]