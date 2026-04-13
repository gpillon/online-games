import type { LeaderboardEntry } from '@online-games/shared';
import { motion } from 'framer-motion';
import { Crown, Medal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/ui/Card';
import { apiFetch } from '@/services/api';

function formatFraction(n: number): string {
  const third = n % 1;
  const whole = Math.floor(n);
  if (Math.abs(third) < 0.01) return String(whole);
  if (Math.abs(third - 1 / 3) < 0.01) return `${whole}\u2153`;
  if (Math.abs(third - 2 / 3) < 0.01) return `${whole}\u2154`;
  return n.toFixed(1);
}

function pct(n: number): string {
  const v = n <= 1 ? n * 100 : n;
  return `${v.toFixed(1)}%`;
}

export function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<LeaderboardEntry[]>('/users/leaderboard')
      .then(setRows)
      .catch(() => setErr('Classifica non disponibile al momento.'));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Crown className="h-10 w-10 text-gold" />
        <div>
          <h1 className="font-display text-4xl text-gradient-gold">Classifica</h1>
          <p className="font-body text-lg text-gold/70">I migliori giocatori dell&apos;Arena.</p>
        </div>
      </div>

      {err && <p className="mb-4 text-red-300/90">{err}</p>}

      <GlassPanel className="overflow-hidden p-0">
        <table className="w-full border-collapse text-left font-body text-lg">
          <thead className="bg-black/35 font-display text-sm uppercase tracking-wider text-gold/80">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Giocatore</th>
              <th className="px-4 py-3 text-right">Punti</th>
              <th className="hidden px-4 py-3 text-right md:table-cell">Partite</th>
              <th className="hidden px-4 py-3 text-right md:table-cell">Vinte</th>
              <th className="hidden px-4 py-3 text-right md:table-cell">Win %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !err ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gold/60">
                  Nessun dato ancora — sii il primo a giocare.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <motion.tr
                  key={r.userId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border-t border-gold/10 odd:bg-black/20"
                >
                  <td className="px-4 py-3 font-display text-gold">
                    <span className="inline-flex items-center gap-1">
                      {r.rank === 1 && <Medal className="h-5 w-5 text-amber-300" />}
                      {r.rank === 2 && <Medal className="h-5 w-5 text-slate-300" />}
                      {r.rank === 3 && <Medal className="h-5 w-5 text-amber-700" />}
                      {r.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ivory">{r.username}</td>
                  <td className="px-4 py-3 text-right text-gold">{formatFraction(r.totalPoints)}</td>
                  <td className="hidden px-4 py-3 text-right text-gold/80 md:table-cell">{r.gamesPlayed}</td>
                  <td className="hidden px-4 py-3 text-right text-gold/80 md:table-cell">
                    {r.gamesWon} <span className="text-xs text-gold/50">({pct(r.winRate)})</span>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-gold/70 md:table-cell">
                    {pct(r.winRate)}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}
