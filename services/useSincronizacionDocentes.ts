import { useEffect, useState } from "react";

import {
    type EstadoSincronizacion,
    obtenerEstado,
    refrescarEstado,
    suscribirseAEstado,
} from "./docentesSync";

// Devuelve el estado de la sincronización y se actualiza solo cuando cambia.
export function useEstadoSincronizacion(): EstadoSincronizacion {
  const [estado, setEstado] = useState<EstadoSincronizacion>(obtenerEstado);

  useEffect(() => {
    setEstado(obtenerEstado());

    const cancelar = suscribirseAEstado(setEstado);

    void refrescarEstado();

    return cancelar;
  }, []);

  return estado;
}