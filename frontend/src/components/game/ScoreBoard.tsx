import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/Card';

function formatScore(n: number): string {
  const third = n % 1;
  const whole = Math.floor(n);
  if (Math.abs(third) < 0.01) return String(whole);
  if (Math.abs(third - 1 / 3) < 0.01) return `${whole}⅓`;
  if (Math.abs(third - 2 / 3) < 0.01) return `${whole}⅔`;
  return n.toFixed(1);
}

export interface ScoreBoardProps {
  teamA: number;
  teamB: number;
  teamANames?: string[];
  teamBNames?: string[];
  roundLabel: string;
  handLabel: string;
  targetScore: number;
}

export function ScoreBoard({
  teamA,
  teamB,
  teamANames,
  teamBNames,
  roundLabel,
  handLabel,
  targetScore,
}: ScoreBoardProps) {
  return (
    <GlassPanel className="min-w-0 max-w-full overflow-hidden px-3 py-2 sm:px-4 sm:py-3">
      <div className="flex items-center justify-between gap-2 sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] uppercase tracking-[0.15em] text-gold/70 sm:text-xs sm:tracking-[0.2em]">
            Squadra A
          </p>
          {!!teamANames?.length && (
            <p className="truncate font-body text-[10px] text-gold/50 sm:text-xs">{teamANames.join(' · ')}</p>
          )}
          <motion.p
            key={teamA}
            initial={{ scale: 1.15, color: '#f0d060' }}
            animate={{ scale: 1, color: '#faf3e0' }}
            className="font-display text-2xl text-ivory sm:text-3xl"
          >
            {formatScore(teamA)}
          </motion.p>
        </div>
        <div className="w-max max-w-[36%] shrink-0 px-1 text-center font-body text-[11px] text-gold/80 sm:max-w-none sm:px-2 sm:text-sm">
          <p className="font-display text-[10px] tracking-wide text-gold sm:text-xs sm:tracking-widest">{roundLabel}</p>
          <p className="line-clamp-2 leading-tight">{handLabel}</p>
          <p className="mt-0.5 text-[10px] text-gold/60 sm:mt-1 sm:text-xs">Obiettivo {targetScore}</p>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="font-display text-[10px] uppercase tracking-[0.15em] text-gold/70 sm:text-xs sm:tracking-[0.2em]">
            Squadra B
          </p>
          {!!teamBNames?.length && (
            <p className="truncate font-body text-[10px] text-gold/50 sm:text-xs">{teamBNames.join(' · ')}</p>
          )}
          <motion.p
            key={teamB}
            initial={{ scale: 1.15, color: '#f0d060' }}
            animate={{ scale: 1, color: '#faf3e0' }}
            className="font-display text-2xl text-ivory sm:text-3xl"
          >
            {formatScore(teamB)}
          </motion.p>
        </div>
      </div>
    </GlassPanel>
  );
}
