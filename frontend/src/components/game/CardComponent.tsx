import type { Card } from '@online-games/shared';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { cardFaceSrc, CARD_BACK_SRC } from '@/lib/cardAssets';

export interface CardComponentProps {
  card?: Card;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  playable?: boolean;
  layoutId?: string;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function CardComponent({
  card,
  faceDown,
  selected,
  disabled,
  playable,
  layoutId,
  onClick,
  className = '',
  style,
}: CardComponentProps) {
  const src = faceDown || !card ? CARD_BACK_SRC : cardFaceSrc(card);
  const w = 76;
  const h = 108;

  return (
    <motion.div
      layoutId={layoutId}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      className={`relative cursor-pointer select-none ${className}`}
      style={{ width: w, height: h, ...style }}
      whileHover={
        disabled
          ? undefined
          : { y: -10, rotate: playable ? -2 : -4, scale: 1.04, transition: { type: 'spring', stiffness: 420, damping: 22 } }
      }
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div
        className={`
          playing-card-shadow absolute inset-0 overflow-hidden rounded-md border-2 transition-all duration-300
          ${selected ? 'border-gold shadow-gold-glow ring-2 ring-gold/40' : 'border-gold/20'}
          ${playable && !selected ? 'ring-2 ring-emerald-400/50' : ''}
          ${disabled ? 'opacity-50 grayscale' : ''}
        `}
      >
        <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
        {playable && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            style={{
              boxShadow: 'inset 0 0 24px rgba(212, 175, 55, 0.45)',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
