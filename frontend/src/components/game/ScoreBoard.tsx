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
    <GlassPanel className="px-4 py-3">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-gold/70">Squadra A</p>
          {!!teamANames?.length && (
            <p className="font-body text-xs text-gold/50">{teamANames.join(' · ')}</p>
          )}
          <motion.p
            key={teamA}
            initial={{ scale: 1.15, color: '#f0d060' }}
            animate={{ scale: 1, color: '#faf3e0' }}
            className="font-display text-3xl text-ivory"
          >
            {formatScore(teamA)}
          </motion.p>
        </div>
        <div className="text-center font-body text-sm text-gold/80">
          <p className="font-display text-xs tracking-widest text-gold">{roundLabel}</p>
          <p>{handLabel}</p>
          <p className="mt-1 text-xs text-gold/60">Obiettivo {targetScore}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-gold/70">Squadra B</p>
          {!!teamBNames?.length && (
            <p className="font-body text-xs text-gold/50">{teamBNames.join(' · ')}</p>
          )}
          <motion.p
            key={teamB}
            initial={{ scale: 1.15, color: '#f0d060' }}
            animate={{ scale: 1, color: '#faf3e0' }}
            className="font-display text-3xl text-ivory"
          >
            {formatScore(teamB)}
          </motion.p>
        </div>
      </div>
    </GlassPanel>
  );
}
