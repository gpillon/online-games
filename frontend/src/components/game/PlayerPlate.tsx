import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Wifi, WifiOff } from 'lucide-react';
import type { TressettePlayerInfo } from '@online-games/shared';

export interface PlayerPlateProps {
  player: TressettePlayerInfo;
  isTurn: boolean;
  cardCount?: number;
  compact?: boolean;
}

const teamColor: Record<number, { bg: string; text: string; ring: string; label: string }> = {
  0: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', ring: 'ring-cyan-400/40', label: 'A' },
  1: { bg: 'bg-rose-500/20', text: 'text-rose-300', ring: 'ring-rose-400/40', label: 'B' },
};

export function PlayerPlate({ player, isTurn, cardCount, compact }: PlayerPlateProps) {
  const team = teamColor[player.team % 2] ?? teamColor[0];

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {isTurn && (
          <motion.div
            className="absolute -top-6 z-10 rounded-full bg-gold px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-black shadow-lg shadow-gold/40 sm:-top-7 sm:px-3 sm:text-[11px] sm:tracking-widest"
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              Turno
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        layout
        className={`
          wood-panel flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2
          ${compact ? 'min-w-0 max-w-[11.5rem] sm:max-w-none sm:min-w-[140px]' : 'min-w-0 sm:min-w-[180px]'}
          ${isTurn ? 'ring-2 ring-gold shadow-lg shadow-gold/30' : `ring-1 ${team.ring}`}
        `}
      >
        <div className="relative shrink-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border font-display text-xs sm:h-9 sm:w-9 sm:text-sm ${
              isTurn ? 'border-gold bg-gold/20 text-gold' : 'border-gold/40 bg-burgundy/40 text-gold'
            }`}
          >
            {player.name.slice(0, 1).toUpperCase()}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold sm:-bottom-1 sm:-right-1 sm:h-4 sm:w-4 sm:text-[9px] ${team.bg} ${team.text} ring-1 ring-black/30`}
          >
            {team.label}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 truncate font-display text-xs tracking-wide text-ivory sm:gap-1.5 sm:text-sm">
            {player.isAI && <Bot className="h-3 w-3 shrink-0 text-gold/80 sm:h-3.5 sm:w-3.5" aria-hidden />}
            <span className="truncate">{player.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gold/70 sm:gap-2 sm:text-xs">
            {cardCount !== undefined && <span>{cardCount} carte</span>}
            <span className="inline-flex items-center gap-0.5">
              {player.connected ? (
                <Wifi className="h-3 w-3 text-emerald-400/90" aria-label="Connesso" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-400/80" aria-label="Disconnesso" />
              )}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
