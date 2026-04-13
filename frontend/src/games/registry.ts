import * as OG from '@online-games/shared';
import type { ComponentType } from 'react';
import { TressetteGame } from '@/games/tressette/TressetteGame';

export interface GameViewProps {
  gameId: string;
}

export interface GameRegistryEntry {
  component: ComponentType<GameViewProps>;
  title: string;
  subtitle: string;
}

export const gameRegistry: Record<OG.GameType, GameRegistryEntry> = {
  [OG.GameType.TRESSETTE]: {
    component: TressetteGame,
    title: 'Tressette',
    subtitle: 'Il classico a coppie, tra tradizione e astuzia.',
  },
};

export function getGameEntry(type: OG.GameType): GameRegistryEntry {
  return gameRegistry[type];
}
