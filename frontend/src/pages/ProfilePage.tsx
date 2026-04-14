import type { UserProfile } from '@online-games/shared';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EmoteUpload } from '@/components/EmoteUpload';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import { apiFetch } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

function formatFraction(n: number): string {
  const third = n % 1;
  const whole = Math.floor(n);
  if (Math.abs(third) < 0.01) return String(whole);
  if (Math.abs(third - 1 / 3) < 0.01) return `${whole}\u2153`;
  if (Math.abs(third - 2 / 3) < 0.01) return `${whole}\u2154`;
  return n.toFixed(1);
}

export function ProfilePage() {
  const { user, token, checkAuth } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(user);
  const [err, setErr] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [nameOk, setNameOk] = useState(false);

  const handleNameChange = async () => {
    setNameErr('');
    setNameOk(false);
    try {
      const updated = await apiFetch<UserProfile>('/users/username', {
        token,
        method: 'PATCH',
        body: { username: newName.trim() },
      });
      setProfile(updated);
      setNameOk(true);
      setNewName('');
      void checkAuth();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Errore nel cambio nome';
      setNameErr(msg);
    }
  };

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }
    void apiFetch<UserProfile>('/users/profile', { token })
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

      {p.isAnonymous && (
        <GlassPanel className="p-6">
          <h3 className="mb-3 font-display text-lg text-gold">Cambia nome</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={20}
              className="flex-1 rounded-lg border border-gold/20 bg-black/40 px-3 py-2 font-body text-sm text-ivory focus:border-gold/50 focus:outline-none"
              placeholder="Nuovo nome"
            />
            <Button
              type="button"
              variant="primary"
              className="text-sm"
              onClick={() => void handleNameChange()}
              disabled={!newName.trim() || newName.length < 2}
            >
              Salva
            </Button>
          </div>
          {nameErr && <p className="mt-2 text-xs text-red-400">{nameErr}</p>}
          {nameOk && <p className="mt-2 text-xs text-emerald-400">Nome aggiornato!</p>}
        </GlassPanel>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Partite', value: String(p.stats.gamesPlayed) },
          { label: 'Vittorie', value: String(p.stats.gamesWon) },
          { label: 'Punti', value: formatFraction(p.stats.totalPoints) },
          { label: 'Win %', value: p.stats.gamesPlayed ? `${((p.stats.gamesWon / p.stats.gamesPlayed) * 100).toFixed(1)}%` : '—' },
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

      <GlassPanel className="p-6">
        <h3 className="mb-4 font-display text-xl text-gold">Le tue emote</h3>
        <EmoteUpload />
      </GlassPanel>
    </div>
  );
}
