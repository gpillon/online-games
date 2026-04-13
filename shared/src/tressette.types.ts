import { Card } from './card.types';
import { GameStateBase } from './game.interfaces';

export enum TressetteMode {
  TWO_PLAYERS = '2p',
  THREE_WITH_MORTO = '3p_morto',
  FOUR_PLAYERS = '4p',
}

export interface TressetteGameState extends GameStateBase {
  hands: Record<string, Card[]>; // only the current player's hand on client
  currentTrick: TrickCard[];
  trickWinner?: string;
  teamScores: [number, number];
  tricksWon: Record<string, Card[][]>;
  deckRemaining: number;
  mode: TressetteMode;
  dealer: number;
  trumpSuit?: null; // tressette has no trump
  lastTrick?: TrickCard[];
  declarations?: TressetteDeclaration[];
  handNumber: number;
  targetScore: number;
}

export interface TressetteClientState {
  gameId: string;
  myHand: Card[];
  currentTrick: TrickCard[];
  lastTrick?: TrickCard[];
  currentPlayerIndex: number;
  myIndex: number;
  players: TressettePlayerInfo[];
  teamScores: [number, number];
  deckRemaining: number;
  status: string;
  mode: TressetteMode;
  dealer: number;
  handNumber: number;
  targetScore: number;
  trickWinner?: string;
  declarations?: TressetteDeclaration[];
  canDeclare?: boolean;
}

export interface TressettePlayerInfo {
  id: string;
  name: string;
  seatIndex: number;
  cardCount: number;
  team: number;
  connected: boolean;
  isAI: boolean;
  isMorto: boolean;
}

export interface TrickCard {
  card: Card;
  playerId: string;
  playerName: string;
  seatIndex: number;
}

export interface TressetteDeclaration {
  playerId: string;
  type: TressetteDeclarationType;
  cards: Card[];
  points: number;
}

export enum TressetteDeclarationType {
  NAPOLETANA = 'napoletana', // A, 2, 3 of same suit
  BONGIOCO = 'bongioco', // 3+ cards value >= 1 each (A, 2, 3)
}

export const TRESSETTE_CARD_ORDER: number[] = [3, 2, 1, 10, 9, 8, 7, 6, 5, 4];

export const TRESSETTE_CARD_POINTS: Record<number, number> = {
  1: 1,     // Asso
  2: 1 / 3, // Due
  3: 1 / 3, // Tre
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 1 / 3, // Fante
  9: 1 / 3, // Cavallo
  10: 1 / 3, // Re
};
