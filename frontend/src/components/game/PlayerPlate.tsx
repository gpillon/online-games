import { motion } from 'framer-motion';
import { Bot, Wifi, WifiOff } from 'lucide-react';
import type { TressettePlayerInfo } from '@online-games/shared';

export interface PlayerPlateProps {
  player: TressettePlayerInfo;
  isTurn: boolean;
  cardCount?: number;
  compact?: boolean;
}

const teamRing: Record<number, string> = {
  0: 'ring-cyan-400/40',
  1: 'ring-rose-400/40',
};

export function PlayerPlate({ player, isTurn, cardCount, compact }: PlayerPlateProps) {
  const ring = teamRing[player.team % 2] ?? 'ring-gold/30';

  return (
    <motion.div
      layout
      className={`
        wood-panel flex items-center gap-2 rounded-lg px-3 py-2
        ${compact ? 'min-w-[140px]' : 'min-w-[180px]'}
        ${isTurn ? 'animate-pulse-gold ring-2 ring-gold/70' : `ring-1 ${ring}`}
      `}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-burgundy/40 font-display text-sm text-gold">
        {player.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate font-display text-sm tracking-wide text-ivory">
          {player.isAI && <Bot className="h-3.5 w-3.5 shrink-0 text-gold/80" aria-hidden />}
          <span className="truncate">{player.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gold/70">
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
  );
}
