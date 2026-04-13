export enum Suit {
  BASTONI = 'bastoni',
  COPPE = 'coppe',
  DENARA = 'denara',
  SPADE = 'spade',
}

export enum Rank {
  ASSO = 1,
  DUE = 2,
  TRE = 3,
  QUATTRO = 4,
  CINQUE = 5,
  SEI = 6,
  SETTE = 7,
  FANTE = 8,
  CAVALLO = 9,
  RE = 10,
}

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "bastoni1"
}

export function cardId(suit: Suit, rank: Rank): string {
  return `${suit}${rank}`;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of Object.values(Suit)) {
    for (let r = 1; r <= 10; r++) {
      const rank = r as Rank;
      deck.push({ suit, rank, id: cardId(suit, rank) });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
