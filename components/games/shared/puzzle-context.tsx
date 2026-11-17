"use client";

import { createContext, useContext, ReactNode } from "react";
import type { ChallengeTarget } from "@/lib/puzzles/types";

interface PuzzleContextValue {
  challenge?: ChallengeTarget;
  playerName?: string;
}

const PuzzleContext = createContext<PuzzleContextValue>({});

export function PuzzleContextProvider({
  challenge,
  playerName,
  children,
}: PuzzleContextValue & { children: ReactNode }) {
  return (
    <PuzzleContext.Provider value={{ challenge, playerName }}>{children}</PuzzleContext.Provider>
  );
}

export function usePuzzleContext() {
  return useContext(PuzzleContext);
}
