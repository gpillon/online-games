import type { Card } from '@online-games/shared';

export function cardFaceSrc(card: Pick<Card, 'id'>): string {
  return `/cards/${card.id}.png`;
}

export const CARD_BACK_SRC = '/cards/card-back.svg';
