import { Stack } from "expo-router";

import AppProviders from "../context/AppProviders";

export default function RootLayout() {
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