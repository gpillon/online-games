import type { TrickCard } from '@online-games/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { CardComponent } from '@/components/game/CardComponent';

export interface TrickAreaProps {
  trick: TrickCard[];
  mySeatIndex: number;
  numPlayers: number;
}

function slotAngle(seat: number, mySeat: number, numPlayers: number): number {
  const rel = (seat - mySeat + numPlayers) % numPlayers;
  if (numPlayers <= 2) {
    return rel === 0 ? 180 : 0;
  }
  if (numPlayers === 3) {
    const m: Record<number, number> = { 0: 180, 1: 90, 2: -90 };
    return m[rel] ?? 0;
  }
  const m4: Record<number, number> = { 0: 180, 1: 90, 2: 0, 3: -90 };
  return m4[rel] ?? 0;
}

export function TrickArea({ trick, mySeatIndex, numPlayers }: TrickAreaProps) {
  const n = Math.max(numPlayers, 2);

  return (
    <div className="relative flex min-h-[140px] items-center justify-center">
      <AnimatePresence mode="popLayout">
        {trick.map((t, i) => {
          const angle = slotAngle(t.seatIndex, mySeatIndex, Math.max(n, 4));
          const dist = 52;
          const rad = (angle * Math.PI) / 180;
          const x = Math.sin(rad) * dist;
          const y = -Math.cos(rad) * dist * 0.5;
          return (
            <motion.div
              key={t.card.id}
              className="absolute"
              initial={{ opacity: 0, scale: 0.5, x: x * 1.8, y: y * 1.8 + 40 }}
              animate={{ opacity: 1, scale: 1, x, y }}
              exit={{ opacity: 0, scale: 0.4, y: y - 24 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.05 }}
            >
              <CardComponent card={t.card} layoutId={`trick-${t.card.id}`} className="scale-90" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
