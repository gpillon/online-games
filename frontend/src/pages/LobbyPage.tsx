import * as OG from '@online-games/shared';
import { motion } from 'framer-motion';
import { Lock, Users } from 'lucide-react';
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

export function LobbyPage() {
  const navigate = useNavigate();
  const { rooms, fetchRooms, subscribeLobby, unsubscribeLobby, createRoom, loading, error } = useLobbyStore();
  const { user, token, loginAnonymous } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('Sala privata');
  const [autoLoginDone, setAutoLoginDone] = useState(!!token);

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
        ) : (
          rooms.map((r) => (
            <GlassPanel key={r.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl text-ivory">{r.name}</h3>
                  {r.isPrivate && <Lock className="h-4 w-4 text-gold/60" aria-label="Privata" />}
                </div>
                <p className="mt-1 flex items-center gap-2 font-body text-gold/75">
                  <Users className="h-4 w-4" />
                  {r.currentPlayers} / {r.maxPlayers} giocatori · Host {r.hostName}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-gold/50">
                  {r.gameType} · {r.status === OG.GameStatus.WAITING ? 'In attesa' : r.status}
                </p>
              </div>
              <Link to={`/room/${r.id}`}>
                <Button type="button" variant="secondary">
                  Entra
                </Button>
              </Link>
            </GlassPanel>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova stanza">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const room = await createRoom({
                name: roomName || 'Sala',
                gameType: OG.GameType.TRESSETTE,
                numPlayers: 4,
                modeId: '4p',
                isPrivate: false,
              });
              setModalOpen(false);
              navigate(`/room/${room.id}`);
            } catch {
              /* store surfaces error via fetchRooms if needed */
            }
          }}
        >
          <Input id="roomname" label="Nome stanza" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
          <p className="font-body text-sm text-gold/65">Tressette · 4 giocatori · modalità predefinita</p>
          <Button type="submit" variant="primary" className="w-full">
            Crea
          </Button>
        </form>
      </Modal>
    </div>
  );
}
