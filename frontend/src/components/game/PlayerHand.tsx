import type { Card } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { CardComponent } from '@/components/game/CardComponent';
import { useViewportWidth } from '@/hooks/useViewportWidth';

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
  const vw = useViewportWidth();
  const narrow = vw < 640;

  const cardW = narrow ? (myTurn ? 68 : 60) : myTurn ? 108 : 96;
  const cardH = narrow ? (myTurn ? 96 : 84) : myTurn ? 152 : 136;
  let overlap = narrow ? (myTurn ? 32 : 28) : myTurn ? 56 : 52;

  const maxHandWidth = Math.max(200, vw - 20);
  let totalWidth = Math.max(narrow ? 220 : 320, (sorted.length - 1) * overlap + cardW);
  if (sorted.length > 1 && totalWidth > maxHandWidth) {
    overlap = Math.max(18, Math.floor((maxHandWidth - cardW) / (sorted.length - 1)));
    totalWidth = (sorted.length - 1) * overlap + cardW;
  }
  const handHeight = narrow ? (myTurn ? 112 : 100) : myTurn ? 176 : 160;

  return (
    <div
      className="relative mx-auto flex justify-center"
      style={{ width: totalWidth, height: handHeight }}
    >
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
                disabled={!myTurn}
                playable={isPlayable}
                onClick={() => isPlayable && onSelect(card)}
                width={cardW}
                height={cardH}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
