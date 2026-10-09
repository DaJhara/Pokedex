from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routes.onepieceRoutes import router as onepiece_router


app = FastAPI(
    title="One Piece API",
    description=(
        "Microservicio Python para consultar "
        "personajes de One Piece almacenados "
        "en MongoDB."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onepiece_router)


@app.get("/")
def inicio():
    return {
        "mensaje": "Microservicio One Piece funcionando"
    }