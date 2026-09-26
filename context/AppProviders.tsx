import React from "react";

import { OnePieceProvider } from "./OnePieceContext";
import { PokemonProvider } from "./PokemonContext";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PokemonProvider>
      <OnePieceProvider>
        {children}
      </OnePieceProvider>
    </PokemonProvider>
  );
}