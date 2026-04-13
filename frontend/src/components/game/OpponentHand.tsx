import { motion } from 'framer-motion';
import { CardComponent } from '@/components/game/CardComponent';

export type OpponentOrientation = 'top' | 'left' | 'right';

export interface OpponentHandProps {
  count: number;
  orientation: OpponentOrientation;
}

const rotate: Record<OpponentOrientation, number> = {
  top: 180,
  left: 90,
  right: -90,
};

export function OpponentHand({ count, orientation }: OpponentHandProps) {
  const n = Math.min(Math.max(count, 0), 10);
  const overlap = orientation === 'top' ? 28 : 22;
  const spread = (n - 1) * overlap + 56;

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{
        width: orientation === 'top' ? spread : 100,
        height: orientation === 'top' ? 100 : spread,
        transform: `rotate(${rotate[orientation]}deg)`,
      }}
      initial={{ opacity: 0 }}
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
          initial={{ opacity: 0, y: orientation === 'top' ? -12 : 0 }}
          animate={{ opacity: 1 - i * 0.03, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <CardComponent faceDown className="scale-[0.72]" />
        </motion.div>
      ))}
    </motion.div>
  );
}
