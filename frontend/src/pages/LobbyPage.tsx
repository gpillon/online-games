import * as OG from '@online-games/shared';
import { GameStatus, TressetteMode } from '@online-games/shared';
import { motion } from 'framer-motion';
import { Copy, Lock, Play, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getGameEntry } from '@/games/registry';
import { useSocket } from '@/hooks/useSocket';
import { apiFetch } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useLobbyStore } from '@/stores/lobbyStore';

interface MyGame {
  roomId: string;
  gameId: string;
  name: string;
  status: GameStatus;
}

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

type PublicRoomSortField =
  | 'name'
  | 'hostName'
  | 'currentPlayers'
  | 'modeId'
  | 'status'
  | 'hasPassword';

type SortDir = 'asc' | 'desc';

function publicRoomModeLabel(modeId: string): string {
  if (modeId === TressetteMode.TWO_PLAYERS) return '2 giocatori';
  if (modeId === TressetteMode.THREE_WITH_MORTO) return '3 col morto';
  return '4 giocatori';
}

function publicRoomStatusLabel(status: OG.GameStatus): string {
  if (status === OG.GameStatus.WAITING) return 'In attesa';
  if (status === OG.GameStatus.IN_PROGRESS) return 'In corso';
  if (status === OG.GameStatus.FINISHED) return 'Terminata';
  return String(status);
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
  const [myGames, setMyGames] = useState<MyGame[]>([]);
  const [sortField, setSortField] = useState<PublicRoomSortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSort = (field: PublicRoomSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = rooms;
    if (q) {
      list = rooms.filter(
        (r) =>
          r.name.toLowerCase().includes(q) || r.hostName.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          break;
        case 'hostName':
          cmp = a.hostName.localeCompare(b.hostName, undefined, { sensitivity: 'base' });
          break;
        case 'currentPlayers':
          cmp = a.currentPlayers - b.currentPlayers || a.maxPlayers - b.maxPlayers;
          break;
        case 'modeId':
          cmp = publicRoomModeLabel(a.modeId).localeCompare(
            publicRoomModeLabel(b.modeId),
            undefined,
            { sensitivity: 'base' },
          );
          break;
        case 'status':
          cmp = String(a.status).localeCompare(String(b.status));
          break;
        case 'hasPassword':
          cmp = Number(a.hasPassword) - Number(b.hasPassword);
          break;
        default:
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rooms, searchQuery, sortField, sortDir]);

  const sortMark = (field: PublicRoomSortField) =>
    sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  useEffect(() => {
    if (!token && !autoLoginDone) {
      void loginAnonymous().then(() => setAutoLoginDone(true));
    } else {
      setAutoLoginDone(true);
    }
  }, [token, autoLoginDone, loginAnonymous]);

  useEffect(() => {
    if (!autoLoginDone || !token) return;
    void apiFetch<MyGame[]>('/lobby/my-games', { token }).then(setMyGames).catch(() => {});
  }, [autoLoginDone, token]);

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

      {myGames.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-xl tracking-wide text-gold">Le tue partite attive</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {myGames.map((g) => (
              <GlassPanel key={g.roomId} className="flex items-center justify-between gap-4 p-5 ring-1 ring-gold/40">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-lg text-ivory">{g.name}</h3>
                  <p className="text-xs uppercase tracking-wider text-gold/60">
                    {g.status === GameStatus.IN_PROGRESS ? 'In corso' : 'In attesa'}
                  </p>
                </div>
                <Link to={g.gameId ? `/game/${g.gameId}` : `/room/${g.roomId}`}>
                  <Button type="button" variant="primary" className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Rientra
                  </Button>
                </Link>
              </GlassPanel>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="font-display text-xl tracking-wide text-gold">Stanze aperte</h2>
        <Button type="button" variant="primary" onClick={() => setModalOpen(true)}>
          Crea Stanza
        </Button>
      </section>

      {error && <p className="font-body text-red-300/90">{error}</p>}

      <GlassPanel className="overflow-hidden p-4 md:p-6">
        <div className="mb-4">
          <Input
            id="room-search"
            label="Cerca per nome o host"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtra stanze…"
          />
        </div>

        {loading && rooms.length === 0 ? (
          <p className="py-10 text-center font-body text-gold/70">Caricamento stanze…</p>
        ) : rooms.length === 0 ? (
          <p className="py-10 text-center font-body text-gold/70">Nessuna stanza aperta. Creane una!</p>
        ) : filteredRooms.length === 0 ? (
          <p className="py-10 text-center font-body text-gold/70">Nessuna stanza corrisponde alla ricerca.</p>
        ) : (
          <>
            <div className="hidden md:block">
              <div className="overflow-x-auto rounded-lg border border-gold/15 bg-black/20">
                <table className="w-full min-w-[720px] border-collapse text-left font-body text-sm text-ivory/90">
                  <thead>
                    <tr className="border-b border-gold/25 bg-black/30">
                      <th className="px-3 py-3">
                        <button
                          type="button"
                          className="font-display text-xs uppercase tracking-wider text-gold/85 hover:text-gold"
                          onClick={() => toggleSort('name')}
                        >
                          Nome{sortMark('name')}
                        </button>
                      </th>
                      <th className="px-3 py-3">
                        <button
                          type="button"
                          className="font-display text-xs uppercase tracking-wider text-gold/85 hover:text-gold"
                          onClick={() => toggleSort('hostName')}
                        >
                          Host{sortMark('hostName')}
                        </button>
                      </th>
                      <th className="px-3 py-3">
                        <button
                          type="button"
                          className="font-display text-xs uppercase tracking-wider text-gold/85 hover:text-gold"
                          onClick={() => toggleSort('currentPlayers')}
                        >
                          Giocatori{sortMark('currentPlayers')}
                        </button>
                      </th>
                      <th className="px-3 py-3">
                        <button
                          type="button"
                          className="font-display text-xs uppercase tracking-wider text-gold/85 hover:text-gold"
                          onClick={() => toggleSort('modeId')}
                        >
                          Modalità{sortMark('modeId')}
                        </button>
                      </th>
                      <th className="px-3 py-3">
                        <button
                          type="button"
                          className="font-display text-xs uppercase tracking-wider text-gold/85 hover:text-gold"
                          onClick={() => toggleSort('status')}
                        >
                          Stato{sortMark('status')}
                        </button>
                      </th>
                      <th className="px-3 py-3 text-center">
                        <button
                          type="button"
                          className="font-display text-xs uppercase tracking-wider text-gold/85 hover:text-gold"
                          onClick={() => toggleSort('hasPassword')}
                        >
                          Password{sortMark('hasPassword')}
                        </button>
                      </th>
                      <th className="px-3 py-3 font-display text-xs uppercase tracking-wider text-gold/70">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-gold/10 transition hover:bg-gold/[0.04] last:border-0"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-base text-ivory">{r.name}</span>
                            {r.isPrivate && (
                              <span className="text-[10px] uppercase tracking-wider text-gold/45">Privata</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-gold/80">{r.hostName}</td>
                        <td className="px-3 py-3 text-gold/80">
                          {r.currentPlayers} / {r.maxPlayers}
                        </td>
                        <td className="px-3 py-3 text-gold/75">{publicRoomModeLabel(r.modeId)}</td>
                        <td className="px-3 py-3 text-gold/75">{publicRoomStatusLabel(r.status)}</td>
                        <td className="px-3 py-3 text-center">
                          {r.hasPassword ? (
                            <Lock className="mx-auto h-4 w-4 text-gold/70" aria-label="Protetta da password" />
                          ) : (
                            <span className="text-gold/35">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center justify-end gap-2">
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
                            </button>
                            {copied === r.id && (
                              <span className="text-xs text-emerald-300/90">Copiato!</span>
                            )}
                            <Link to={`/room/${r.id}`}>
                              <Button type="button" variant="secondary" className="whitespace-nowrap">
                                {r.status === OG.GameStatus.IN_PROGRESS ? 'Guarda' : 'Entra'}
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 md:hidden">
              {filteredRooms.map((r) => (
                <GlassPanel
                  key={r.id}
                  className="flex flex-col gap-3 border border-gold/15 bg-black/25 p-5 ring-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-display text-xl text-ivory">{r.name}</h3>
                      {(r.isPrivate || r.hasPassword) && (
                        <Lock
                          className="h-4 w-4 shrink-0 text-gold/60"
                          aria-label={
                            r.isPrivate && r.hasPassword
                              ? 'Stanza privata con password'
                              : r.hasPassword
                                ? 'Protetta da password'
                                : 'Stanza privata'
                          }
                        />
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-2 font-body text-gold/75">
                      <Users className="h-4 w-4 shrink-0" />
                      {r.currentPlayers} / {r.maxPlayers} giocatori · Host {r.hostName}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-gold/50">
                      {r.gameType} · {publicRoomModeLabel(r.modeId)} · {publicRoomStatusLabel(r.status)}
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
                    <Link to={`/room/${r.id}`} className="ml-auto">
                      <Button type="button" variant="secondary">
                        {r.status === OG.GameStatus.IN_PROGRESS ? 'Guarda' : 'Entra'}
                      </Button>
                    </Link>
                  </div>
                </GlassPanel>
              ))}
            </div>
          </>
        )}
      </GlassPanel>

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
                password: password.trim() ? password : undefined,
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

          <Input
            id="password"
            label="Password (opzionale)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
          />

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
