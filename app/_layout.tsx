import { Stack } from "expo-router";
import { useEffect } from "react";

import AppProviders from "../context/AppProviders";
import { iniciarSincronizacionDocentes } from "../services/docentesSync";

export default function RootLayout() {
  // Detecta cuándo hay comunicación con los microservicios y sincroniza el CRUD de docentes
  useEffect(() => iniciarSincronizacionDocentes(), []);

  return (
    <AppProviders>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </AppProviders>
  );
}