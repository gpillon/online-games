import type { UserProfile } from '@online-games/shared';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/ui/Card';
import { apiFetch } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export function ProfilePage() {
  const { user, token, checkAuth } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(user);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }
    void apiFetch<UserProfile>('/profile', { token })
      .then(setProfile)
      .catch(() => setErr('Profilo non disponibile.'));
  }, [token]);

  const p = profile ?? user;

  if (!p) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <GlassPanel className="p-8">
          <p className="font-display text-xl text-gold">Accedi per vedere il profilo.</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="font-display text-4xl text-gradient-gold">Il tuo profilo</h1>
      {err && <p className="text-sm text-red-300/90">{err}</p>}
      <GlassPanel className="p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <motion.div
            className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold/50 bg-burgundy/40 font-display text-3xl text-gold"
            layoutId="avatar"
          >
            {p.username.slice(0, 1).toUpperCase()}
          </motion.div>
          <div>
            <h2 className="font-display text-3xl text-ivory">{p.username}</h2>
            <p className="font-body text-gold/70">{p.email ?? 'Giocatore anonimo'}</p>
            <p className="mt-2 text-xs text-gold/50">Membro dal {new Date(p.createdAt).toLocaleDateString('it-IT')}</p>
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Partite', value: p.stats.gamesPlayed },
          { label: 'Vittorie', value: p.stats.gamesWon },
          { label: 'Punti', value: p.stats.totalPoints },
        ].map((s) => (
          <GlassPanel key={s.label} className="p-5 text-center">
            <p className="font-display text-3xl text-gold">{s.value}</p>
            <p className="font-body text-sm uppercase tracking-wider text-gold/60">{s.label}</p>
          </GlassPanel>
        ))}
      </div>

      <GlassPanel className="p-6">
        <h3 className="mb-4 font-display text-xl text-gold">Cronologia recente</h3>
        <p className="font-body text-gold/65">
          Le partite giocate appariranno qui quando il server memorizzerà la cronologia.
        </p>
      </GlassPanel>
    </div>
  );
}
