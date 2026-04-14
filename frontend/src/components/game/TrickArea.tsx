import type { TrickCard } from '@online-games/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { CardComponent } from '@/components/game/CardComponent';

export interface TrickAreaProps {
  trick: TrickCard[];
  mySeatIndex: number;
  numPlayers: number;
  trickWinnerSeat?: number;
}

function seatPosition(
  seat: number,
  mySeat: number,
  numPlayers: number,
): { x: number; y: number } {
  const n = Math.max(numPlayers, 2);
  const rel = (seat - mySeat + n) % n;

  if (n <= 2) {
    return rel === 0 ? { x: 0, y: 70 } : { x: 0, y: -70 };
  }
  if (n === 3) {
    const positions: Record<number, { x: number; y: number }> = {
      0: { x: 0, y: 70 },
      1: { x: 90, y: 0 },
      2: { x: -90, y: 0 },
    };
    return positions[rel] ?? { x: 0, y: 0 };
  }
  const positions4: Record<number, { x: number; y: number }> = {
    0: { x: 0, y: 70 },
    1: { x: 100, y: 0 },
    2: { x: 0, y: -70 },
    3: { x: -100, y: 0 },
  };
  return positions4[rel] ?? { x: 0, y: 0 };
}

function winnerDirection(
  seat: number,
  mySeat: number,
  numPlayers: number,
): { x: number; y: number } {
  const pos = seatPosition(seat, mySeat, numPlayers);
  const scale = 2.8;
  return { x: pos.x * scale, y: pos.y * scale };
}

export function TrickArea({ trick, mySeatIndex, numPlayers, trickWinnerSeat }: TrickAreaProps) {
  const exit =
    trickWinnerSeat !== undefined
      ? winnerDirection(trickWinnerSeat, mySeatIndex, numPlayers)
      : { x: 0, y: -60 };

  return (
    <div className="relative flex min-h-[160px] items-center justify-center">
      <AnimatePresence mode="popLayout">
        {trick.map((t, i) => {
          const pos = seatPosition(t.seatIndex, mySeatIndex, numPlayers);
          return (
            <motion.div
              key={t.card.id}
              className="absolute"
              initial={{ opacity: 0, scale: 0.5, x: pos.x * 2, y: pos.y * 2 }}
              animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
              exit={{ opacity: 0, scale: 0.6, x: exit.x, y: exit.y }}
              transition={{ type: 'spring', stiffness: 350, damping: 24, delay: i * 0.04 }}
            >
              <CardComponent card={t.card} layoutId={`trick-${t.card.id}`} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
