import type { ChatMessage, GameRoom, TressetteClientState } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { WS_EVENTS } from '@/lib/wsEvents';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Bot, Copy, Crown, Send, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useSocket } from '@/hooks/useSocket';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';

type RoomExt = GameRoom & { activeGameId?: string };

/** Swap two occupied seats and return the full orderedIds payload for ROOM_REORDER. */
function orderedIdsAfterSeatSwap(room: GameRoom, seatA: number, seatB: number): string[] | null {
  const sorted = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const ia = sorted.findIndex((p) => p.seatIndex === seatA);
  const ib = sorted.findIndex((p) => p.seatIndex === seatB);
  if (ia < 0 || ib < 0) return null;
  const ids = sorted.map((p) => p.id);
  const next = [...ids];
  [next[ia], next[ib]] = [next[ib], next[ia]];
  return next;
}

export function GameRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!token) {
      navigate(`/login?returnTo=${encodeURIComponent(`/room/${roomId}`)}`);
    }
  }, [token, roomId, navigate]);
  const {
    currentRoom,
    joinRoom,
    leaveRoom,
    addAi,
    kickPlayer,
    removeAi,
    reorderPlayers,
    startGame,
    sendChat,
    chatMessages,
    appendChat,
    patchCurrentRoom,
  } = useLobbyStore();
  const [chatInput, setChatInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useSocket(true);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    joinRoom({ roomId })
      .then(() => setJoinError(null))
      .catch((e) => {
        if (!cancelled) setJoinError(e instanceof Error ? e.message : 'Errore');
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, joinRoom]);

  useEffect(() => {
    const s = getSocket();
    if (!s || !roomId) return;
    const onRoom = (room: RoomExt | { id: string; closed: true }) => {
      if ('closed' in room && room.closed) {
        if (room.id === roomId) {
          patchCurrentRoom(room);
          navigate('/lobby');
        }
        return;
      }
      const r = room as RoomExt;
      if (r.id !== roomId) return;
      patchCurrentRoom(r);
      if (r.status === OG.GameStatus.IN_PROGRESS && r.activeGameId) {
        navigate(`/game/${r.activeGameId}`);
      }
    };
    const onChat = (msg: ChatMessage) => appendChat(msg);
    const onGameState = (payload: TressetteClientState & { gameId: string; validCardIds?: string[] }) => {
      const { validCardIds, ...rest } = payload;
      useGameStore.getState().clearGame();
      useGameStore.setState({
        gameId: rest.gameId,
        gameType: OG.GameType.TRESSETTE,
        clientState: rest,
        validCardIds: validCardIds ?? null,
        error: null,
      });
      navigate(`/game/${payload.gameId}`);
    };
    s.on(WS_EVENTS.ROOM_UPDATE, onRoom);
    s.on(WS_EVENTS.ROOM_CHAT_MESSAGE, onChat);
    s.on(WS_EVENTS.GAME_STATE, onGameState);
    return () => {
      s.off(WS_EVENTS.ROOM_UPDATE, onRoom);
      s.off(WS_EVENTS.ROOM_CHAT_MESSAGE, onChat);
      s.off(WS_EVENTS.GAME_STATE, onGameState);
    };
  }, [roomId, navigate, appendChat, patchCurrentRoom]);

  const room = currentRoom?.id === roomId ? currentRoom : null;
  const isHost = !!(user && room && room.hostId === user.id);
  const max = room?.maxPlayers ?? 4;
  const canHostEdit = isHost && room && room.status === OG.GameStatus.WAITING;

  if (joinError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <GlassPanel className="p-8">
          <p className="font-display text-xl text-gold">{joinError}</p>
          <Link to="/lobby" className="mt-6 inline-block font-body text-gold/80 underline">
            Torna alla sala
          </Link>
        </GlassPanel>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <motion.div
          className="h-12 w-12 rounded-full border-2 border-gold/30 border-t-gold"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
        <p className="font-display text-lg text-gold/80">Entrata nella stanza…</p>
      </div>
    );
  }

  const seats = Array.from({ length: max }, (_, i) => room.players.find((p) => p.seatIndex === i));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 overflow-x-hidden px-3 py-6 sm:gap-6 sm:px-4 sm:py-8 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl text-gradient-gold sm:text-3xl">{room.name}</h1>
            <p className="font-body text-sm text-gold/70 sm:text-base">
              {room.players.length} / {max} giocatori
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded px-3 py-1.5 text-xs text-gold/60 transition hover:bg-gold/10 hover:text-gold"
              title="Copia link stanza"
              onClick={() => {
                void navigator.clipboard.writeText(`${window.location.origin}/room/${room.id}`);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              {linkCopied ? 'Copiato!' : 'Condividi'}
            </button>
            {isHost && (
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 text-xs sm:text-sm"
                onClick={() => {
                  getSocket()?.emit(WS_EVENTS.ROOM_CLOSE, { roomId: room.id });
                  navigate('/lobby');
                }}
              >
                Chiudi stanza
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="shrink-0 text-xs sm:text-sm"
              onClick={() => {
                void leaveRoom(room.id);
                navigate('/lobby');
              }}
            >
              Esci
            </Button>
          </div>
        </div>

        <GlassPanel className="felt-table felt-noise relative max-w-full overflow-hidden p-4 sm:p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.07),transparent_60%)]" />
          <div className="relative space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-1 border-b border-gold/20 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <h2 className="font-display text-base text-gold sm:text-lg">Posti al tavolo</h2>
              <span className="font-body text-[10px] text-gold/50 sm:text-xs">Posto 0 in alto</span>
            </div>

            <div className="space-y-2">
              {seats.map((p, slot) => {
                const hasAbove = slot > 0 && !!seats[slot - 1];
                const hasBelow = slot < max - 1 && !!seats[slot + 1];
                const isSelf = !!(user && p && p.id === user.id);

                return (
                  <motion.div
                    key={slot}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: slot * 0.04 }}
                    className={`grid min-h-[4rem] items-center gap-2 rounded-lg border px-2 py-2 sm:min-h-[4.25rem] sm:gap-3 sm:px-3 md:px-4 ${
                      canHostEdit
                        ? 'grid-cols-[2.25rem_minmax(0,1fr)_4.5rem] sm:grid-cols-[2.75rem_1fr_5.75rem]'
                        : 'grid-cols-[2.25rem_minmax(0,1fr)] sm:grid-cols-[2.75rem_1fr]'
                    } ${p ? 'border-gold/35 bg-black/25' : 'border border-dashed border-gold/25 bg-black/15'}`}
                  >
                    <div className="flex flex-col items-center justify-center border-r border-gold/15 py-1 pr-2 text-center sm:pr-3">
                      <span className="font-mono text-[10px] text-gold/45 sm:text-xs">#</span>
                      <span className="font-display text-base text-gold sm:text-lg">{slot}</span>
                    </div>

                    <div className="min-w-0 py-1">
                      {p ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <div className="flex min-w-0 items-center gap-2">
                            {p.id === room.hostId && (
                              <Crown className="h-3.5 w-3.5 shrink-0 text-gold sm:h-4 sm:w-4" aria-label="Host" />
                            )}
                            {p.type === OG.PlayerType.AI && (
                              <Bot className="h-3.5 w-3.5 shrink-0 text-gold/70 sm:h-4 sm:w-4" aria-label="Bot" />
                            )}
                            <p className="truncate font-display text-sm text-ivory sm:text-base">{p.name}</p>
                          </div>
                          <span className="text-[10px] leading-snug text-gold/55 sm:text-xs">
                            {p.type === OG.PlayerType.AI
                              ? 'Bot'
                              : p.type === OG.PlayerType.HUMAN
                                ? p.connected
                                  ? 'Giocatore · online'
                                  : 'Giocatore · disconnesso'
                                : p.type}
                          </span>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col justify-center gap-1">
                          <p className="font-body text-xs text-gold/50 sm:text-sm">Posto libero</p>
                          {canHostEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 w-fit px-2 text-xs"
                              onClick={() => addAi(room.id, slot)}
                            >
                              Aggiungi Bot
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {canHostEdit && (
                      <div className="flex h-full min-h-[3.25rem] items-center justify-end gap-0.5 border-l border-gold/15 pl-1.5 sm:min-h-[3.5rem] sm:gap-1 sm:pl-2 md:justify-center md:pl-3">
                        {p ? (
                          <>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                title="Sposta su"
                                disabled={!hasAbove}
                                onClick={() => {
                                  const next = orderedIdsAfterSeatSwap(room, slot - 1, slot);
                                  if (next) reorderPlayers(room.id, next);
                                }}
                                className="rounded p-1.5 text-gold/70 transition hover:bg-gold/10 hover:text-gold disabled:pointer-events-none disabled:opacity-25"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Sposta giù"
                                disabled={!hasBelow}
                                onClick={() => {
                                  const next = orderedIdsAfterSeatSwap(room, slot, slot + 1);
                                  if (next) reorderPlayers(room.id, next);
                                }}
                                className="rounded p-1.5 text-gold/70 transition hover:bg-gold/10 hover:text-gold disabled:pointer-events-none disabled:opacity-25"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                            </div>
                            {!isSelf && (
                              <button
                                type="button"
                                title={p.type === OG.PlayerType.AI ? 'Rimuovi bot' : 'Espelli giocatore'}
                                onClick={() =>
                                  p.type === OG.PlayerType.AI
                                    ? removeAi(room.id, p.id)
                                    : kickPlayer(room.id, p.id)
                                }
                                className="rounded p-2 text-gold/60 transition hover:bg-red-950/40 hover:text-red-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </GlassPanel>

        {isHost && room.status === OG.GameStatus.WAITING && (
          <Button type="button" variant="primary" className="w-full md:w-auto" onClick={() => startGame(room.id)}>
            Inizia Partita
          </Button>
        )}
      </div>

      <GlassPanel className="flex h-[min(42vh,22rem)] w-full min-h-0 flex-col sm:h-[min(48vh,26rem)] lg:h-[480px] lg:w-80">
        <h2 className="border-b border-gold/20 px-3 py-2 font-display text-base text-gold sm:px-4 sm:py-3 sm:text-lg">
          Chat
        </h2>
        <div className="scrollbar-elegant min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-2 sm:px-3">
          {chatMessages.map((m) => (
            <div key={m.id} className="rounded-md bg-black/25 px-2 py-1.5">
              <span className="font-display text-xs text-gold">{m.username}</span>
              <p className="break-words font-body text-xs text-ivory/90 sm:text-sm">{m.message}</p>
            </div>
          ))}
        </div>
        <form
          className="flex min-w-0 gap-2 border-t border-gold/20 p-2 sm:p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!chatInput.trim() || !roomId) return;
            sendChat(roomId, chatInput.trim());
            setChatInput('');
          }}
        >
          <Input
            id="chat"
            label="Messaggio"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="self-end px-3">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </GlassPanel>
    </div>
  );
}
