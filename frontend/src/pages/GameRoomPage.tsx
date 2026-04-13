import type { ChatMessage, GameRoom } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { WS_EVENTS } from '@/lib/wsEvents';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useSocket } from '@/hooks/useSocket';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import { useLobbyStore } from '@/stores/lobbyStore';

type RoomExt = GameRoom & { activeGameId?: string };

export function GameRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { currentRoom, joinRoom, leaveRoom, addAi, startGame, sendChat, chatMessages, appendChat, patchCurrentRoom } =
    useLobbyStore();
  const [chatInput, setChatInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

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
    const onRoom = (room: RoomExt) => {
      if (room.id !== roomId) return;
      patchCurrentRoom(room);
      if (room.status === OG.GameStatus.IN_PROGRESS && room.activeGameId) {
        navigate(`/game/${room.activeGameId}`);
      }
    };
    const onChat = (msg: ChatMessage) => appendChat(msg);
    const onGameState = (payload: { gameId: string }) => {
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
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
      <div className="flex-1 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-gradient-gold">{room.name}</h1>
            <p className="font-body text-gold/70">
              {room.players.length} / {max} giocatori · Host:{' '}
              {room.players.find((p) => p.id === room.hostId)?.name ?? '—'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void leaveRoom(room.id);
              navigate('/lobby');
            }}
          >
            Esci
          </Button>
        </div>

        <GlassPanel className="felt-table felt-noise relative overflow-hidden p-8 md:p-12">
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.07),transparent_60%)]" />
          <div className="relative mx-auto aspect-square max-w-md">
            {seats.map((p, i) => {
              const angle = (i / max) * Math.PI * 2 - Math.PI / 2;
              const r = 42;
              const x = 50 + Math.cos(angle) * r;
              const y = 50 + Math.sin(angle) * r;
              return (
                <motion.div
                  key={i}
                  className="absolute w-36 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div
                    className={`wood-panel rounded-lg p-3 text-center ${
                      p ? 'border-gold/40' : 'border border-dashed border-gold/25 bg-black/20'
                    }`}
                  >
                    {p ? (
                      <>
                        <p className="font-display text-sm text-ivory">{p.name}</p>
                        <p className="text-xs text-gold/60">{p.type}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-body text-sm text-gold/50">Posto libero</p>
                        <Button
                          type="button"
                          variant="ghost"
                          className="mt-2 w-full text-xs"
                          onClick={() => addAi(room.id, i)}
                        >
                          Aggiungi Bot
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div className="absolute left-1/2 top-1/2 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/30 bg-black/30 p-4 text-center font-display text-xs text-gold/80">
              Tavolo
            </div>
          </div>
        </GlassPanel>

        {isHost && (
          <Button type="button" variant="primary" className="w-full md:w-auto" onClick={() => startGame(room.id)}>
            Inizia Partita
          </Button>
        )}
      </div>

      <GlassPanel className="flex h-[480px] w-full flex-col lg:w-80">
        <h2 className="border-b border-gold/20 px-4 py-3 font-display text-lg text-gold">Chat</h2>
        <div className="scrollbar-elegant flex-1 space-y-2 overflow-y-auto px-3 py-2">
          {chatMessages.map((m) => (
            <div key={m.id} className="rounded-md bg-black/25 px-2 py-1.5">
              <span className="font-display text-xs text-gold">{m.username}</span>
              <p className="font-body text-sm text-ivory/90">{m.message}</p>
            </div>
          ))}
        </div>
        <form
          className="flex gap-2 border-t border-gold/20 p-3"
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
