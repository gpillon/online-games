import { motion } from 'framer-motion';
import { CardComponent } from '@/components/game/CardComponent';

export type OpponentOrientation = 'top' | 'left' | 'right';

export interface OpponentHandProps {
  count: number;
  orientation: OpponentOrientation;
}

const CARD_W = 64;
const CARD_H = 90;

const rotate: Record<OpponentOrientation, number> = {
  top: 180,
  left: 90,
  right: -90,
};

export function OpponentHand({ count, orientation }: OpponentHandProps) {
  const n = Math.min(Math.max(count, 0), 10);
  const overlap = orientation === 'top' ? 24 : 18;
  const spread = (n - 1) * overlap + CARD_W;

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{
        width: orientation === 'top' ? spread : CARD_H,
        height: orientation === 'top' ? CARD_H : spread,
        transform: `rotate(${rotate[orientation]}deg)`,
      }}
      initial={false}
      animate={{ opacity: 1 }}
    >
      {Array.from({ length: n }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            [orientation === 'top' ? 'left' : 'top']: i * overlap,
            zIndex: i,
          }}
          initial={false}
          animate={{ opacity: 1 - i * 0.03 }}
          transition={{ delay: i * 0.03 }}
        >
          <CardComponent faceDown width={CARD_W} height={CARD_H} />
        </motion.div>
      ))}
    </motion.div>
  );
}
