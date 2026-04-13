import * as OG from '@online-games/shared';
import { TressetteMode } from '@online-games/shared';
import { motion } from 'framer-motion';
import { Copy, Lock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getGameEntry } from '@/games/registry';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';
import { useLobbyStore } from '@/stores/lobbyStore';

const games: { id: string; type?: OG.GameType; label: string; active: boolean }[] = [
  { id: 'tressette', type: OG.GameType.TRESSETTE, label: getGameEntry(OG.GameType.TRESSETTE).title, active: true },
  { id: 'scopa', label: 'Scopa', active: false },
  { id: 'briscola', label: 'Briscola', active: false },
];

const tresseteModes = [
  { id: TressetteMode.TWO_PLAYERS, label: 'Partita in 2', players: 2 },
  { id: TressetteMode.THREE_WITH_MORTO, label: 'Partita in 3 (col morto)', players: 3 },
  { id: TressetteMode.FOUR_PLAYERS, label: 'Partita in 4', players: 4 },
];

function copyRoomLink(roomId: string) {
  const url = `${window.location.origin}/room/${roomId}`;
  void navigator.clipboard.writeText(url);
}

export function LobbyPage() {
  const navigate = useNavigate();
  const { rooms, fetchRooms, subscribeLobby, unsubscribeLobby, createRoom, loading, error } = useLobbyStore();
  const { token, loginAnonymous } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('Sala');
  const [modeId, setModeId] = useState<string>(TressetteMode.FOUR_PLAYERS);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [autoLoginDone, setAutoLoginDone] = useState(!!token);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!token && !autoLoginDone) {
      void loginAnonymous().then(() => setAutoLoginDone(true));
    } else {
      setAutoLoginDone(true);
    }
  }, [token, autoLoginDone, loginAnonymous]);

  useSocket(autoLoginDone);

  useEffect(() => {
    if (!autoLoginDone) return;
    void fetchRooms();
    subscribeLobby();
    return () => unsubscribeLobby();
  }, [autoLoginDone, fetchRooms, subscribeLobby, unsubscribeLobby]);

  const selectedMode = tresseteModes.find((m) => m.id === modeId) ?? tresseteModes[2];

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <div className="text-center md:text-left">
        <h1 className="font-display text-4xl text-gradient-gold md:text-5xl">Sala giochi</h1>
        <p className="mt-2 font-body text-xl text-gold/75">Scegli il gioco, entra in una stanza o creane una nuova.</p>
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl tracking-wide text-gold">Giochi disponibili</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {games.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassPanel className={`p-5 ${g.active ? 'ring-1 ring-gold/50' : 'opacity-60'}`}>
                <h3 className="font-display text-2xl text-ivory">{g.label}</h3>
                <p className="mt-2 font-body text-gold/70">
                  {g.type ? getGameEntry(g.type).subtitle : 'Presto disponibile nel salotto.'}
                </p>
                {g.active ? (
                  <p className="mt-4 font-display text-sm text-emerald-300/90">Attivo</p>
                ) : (
                  <p className="mt-4 font-display text-sm text-gold/50">In arrivo</p>
                )}
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="font-display text-xl tracking-wide text-gold">Stanze aperte</h2>
        <Button type="button" variant="primary" onClick={() => setModalOpen(true)}>
          Crea Stanza
        </Button>
      </section>

      {error && <p className="font-body text-red-300/90">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {loading && rooms.length === 0 ? (
          <GlassPanel className="p-8 text-center font-body text-gold/70">Caricamento stanze…</GlassPanel>
        ) : rooms.length === 0 ? (
          <GlassPanel className="p-8 text-center font-body text-gold/70">Nessuna stanza aperta. Creane una!</GlassPanel>
        ) : (
          rooms.map((r) => (
            <GlassPanel key={r.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-display text-xl text-ivory">{r.name}</h3>
                  {r.isPrivate && <Lock className="h-4 w-4 shrink-0 text-gold/60" aria-label="Privata" />}
                </div>
                <p className="mt-1 flex items-center gap-2 font-body text-gold/75">
                  <Users className="h-4 w-4 shrink-0" />
                  {r.currentPlayers} / {r.maxPlayers} giocatori · Host {r.hostName}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-gold/50">
                  {r.gameType} · {r.modeId === '2p' ? '2 giocatori' : r.modeId === '3p_morto' ? '3 col morto' : '4 giocatori'} ·{' '}
                  {r.status === OG.GameStatus.WAITING ? 'In attesa' : r.status === OG.GameStatus.IN_PROGRESS ? 'In corso' : r.status}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="rounded p-2 text-gold/50 transition hover:bg-gold/10 hover:text-gold"
                  title="Copia link"
                  onClick={() => {
                    copyRoomLink(r.id);
                    setCopied(r.id);
                    setTimeout(() => setCopied(null), 2000);
                  }}
                >
                  <Copy className="h-4 w-4" />
                  {copied === r.id && <span className="ml-1 text-xs text-emerald-300">Copiato!</span>}
                </button>
                <Link to={`/room/${r.id}`}>
                  <Button type="button" variant="secondary">
                    {r.status === OG.GameStatus.IN_PROGRESS ? 'Guarda' : 'Entra'}
                  </Button>
                </Link>
              </div>
            </GlassPanel>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova stanza">
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const room = await createRoom({
                name: roomName || 'Sala',
                gameType: OG.GameType.TRESSETTE,
                numPlayers: selectedMode.players,
                modeId,
                isPrivate,
                password: isPrivate && password ? password : undefined,
              });
              setModalOpen(false);
              navigate(`/room/${room.id}`);
            } catch (err) {
              console.error('Room creation failed:', err);
            }
          }}
        >
          <Input id="roomname" label="Nome stanza" value={roomName} onChange={(e) => setRoomName(e.target.value)} />

          <div>
            <label className="mb-2 block font-display text-sm text-gold">Modalità di gioco</label>
            <div className="flex flex-col gap-2">
              {tresseteModes.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                    modeId === m.id
                      ? 'border-gold/60 bg-gold/10 text-ivory'
                      : 'border-gold/20 bg-black/20 text-gold/70 hover:border-gold/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m.id}
                    checked={modeId === m.id}
                    onChange={() => setModeId(m.id)}
                    className="accent-gold"
                  />
                  <span className="font-body">{m.label}</span>
                  <span className="ml-auto text-xs text-gold/50">{m.players} giocatori</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-gold/80">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="accent-gold"
              />
              Stanza privata
            </label>
            {isPrivate && <Lock className="h-4 w-4 text-gold/50" />}
          </div>

          {isPrivate && (
            <Input
              id="password"
              label="Password (opzionale)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          <p className="font-body text-sm text-gold/60">
            Tressette · {selectedMode.players} giocatori · {selectedMode.label}
            {isPrivate ? ' · Privata' : ' · Pubblica'}
          </p>
          <Button type="submit" variant="primary" className="w-full">
            Crea
          </Button>
        </form>
      </Modal>
    </div>
  );
}
