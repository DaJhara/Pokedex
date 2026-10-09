from fastapi import FastAPI

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


app.include_router(onepiece_router)


@app.get("/")
def inicio():
    return {
        "mensaje": "Microservicio One Piece funcionando"
    }