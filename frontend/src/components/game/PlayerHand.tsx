import type { Card } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { CardComponent } from '@/components/game/CardComponent';

function sortHand(cards: Card[]): Card[] {
  const rankOrder = new Map(OG.TRESSETTE_CARD_ORDER.map((r, i) => [r, i]));
  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) return String(a.suit).localeCompare(String(b.suit));
    return (rankOrder.get(a.rank) ?? 99) - (rankOrder.get(b.rank) ?? 99);
  });
}

export interface PlayerHandProps {
  cards: Card[];
  selectedId: string | null;
  onSelect: (card: Card) => void;
  validCardIds: string[] | null;
  myTurn: boolean;
}

export function PlayerHand({ cards, selectedId, onSelect, validCardIds, myTurn }: PlayerHandProps) {
  const sorted = sortHand(cards);
  const overlap = 42;
  const totalWidth = Math.max(280, (sorted.length - 1) * overlap + 76);

  return (
    <div className="relative flex justify-center" style={{ width: totalWidth, height: 140 }}>
      <AnimatePresence>
        {sorted.map((card, i) => {
          const isPlayable =
            myTurn &&
            (validCardIds == null ||
              validCardIds.length === 0 ||
              validCardIds.includes(card.id));
          const angle = (i - (sorted.length - 1) / 2) * 3.2;
          const x = i * overlap;
          return (
            <motion.div
              key={card.id}
              className="absolute bottom-0"
              style={{ left: x, zIndex: i + 10 }}
              initial={{ opacity: 0, y: 50, rotate: angle - 8 }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: angle,
                transition: { delay: i * 0.04, type: 'spring', stiffness: 280, damping: 22 },
              }}
              exit={{ opacity: 0, y: 20 }}
              whileHover={{ zIndex: 80 }}
            >
              <CardComponent
                card={card}
                layoutId={`hand-${card.id}`}
                selected={selectedId === card.id}
                disabled={!isPlayable}
                playable={isPlayable}
                onClick={() => isPlayable && onSelect(card)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
