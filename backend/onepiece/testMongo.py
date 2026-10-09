import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

uri = os.getenv("MONGODB_URI")

if not uri:
    raise Exception("No se encontró MONGODB_URI")

client = MongoClient(uri)

client.admin.command("ping")

print("Conexión con MongoDB Atlas exitosa")