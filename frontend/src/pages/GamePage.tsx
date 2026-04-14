import type { TrickCard } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CardComponent } from '@/components/game/CardComponent';
import { EmotePanel } from '@/components/game/EmotePanel';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getGameEntry } from '@/games/registry';
import { useSocket } from '@/hooks/useSocket';
import { WS_EVENTS } from '@/lib/wsEvents';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';

export function GamePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const gameId = id ?? '';
  useSocket(true);

  const user = useAuthStore((s) => s.user);
  const currentRoom = useLobbyStore((s) => s.currentRoom);
  const isHost = !!user && user.id === currentRoom?.hostId;

  const client = useGameStore((s) => s.clientState);
  const gameType = useGameStore((s) => s.gameType) ?? OG.GameType.TRESSETTE;
  const lastOpen = useGameStore((s) => s.lastTrickModalOpen);
  const setLastOpen = useGameStore((s) => s.setLastTrickModalOpen);
  const clearGame = useGameStore((s) => s.clearGame);
  const bindGameEvents = useGameStore((s) => s.bindGameEvents);

  useEffect(() => {
    if (!gameId) return;
    const unbind = bindGameEvents(gameId, OG.GameType.TRESSETTE);
    return () => {
      unbind();
      clearGame();
    };
  }, [gameId, bindGameEvents, clearGame]);

  const entry = getGameEntry(gameType);
  const { component: GameView } = entry;

  const lastTrick: TrickCard[] | undefined = client?.lastTrick;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-felt-radial opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.08),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(139,26,43,0.12),transparent_35%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-3 pt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.35em] text-gold/60">{entry.title}</p>
            <h1 className="font-display text-2xl text-gradient-gold md:text-3xl">Tavolo da gioco</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EmotePanel roomId={currentRoom?.id ?? ''} />
            <Button type="button" variant="ghost" className="text-xs" onClick={() => setLastOpen(true)}>
              Ultima presa
            </Button>
            <Link to="/lobby">
              <Button type="button" variant="secondary" className="text-xs">
                Sala giochi
              </Button>
            </Link>
            {isHost && (
              <Button
                type="button"
                variant="ghost"
                className="text-xs text-red-400 hover:text-red-300"
                onClick={() => {
                  getSocket()?.emit(WS_EVENTS.ROOM_CLOSE, { roomId: currentRoom!.id });
                  navigate('/lobby');
                }}
              >
                <X className="mr-1 h-3 w-3" /> Chiudi partita
              </Button>
            )}
          </div>
        </div>

        <GameView gameId={gameId} />
      </div>

      <Modal open={lastOpen} onClose={() => setLastOpen(false)} title="Ultima presa">
        <div className="flex flex-wrap justify-center gap-4 py-4">
          {lastTrick?.length ? (
            lastTrick.map((t) => (
              <div key={`${t.card.id}-${t.playerId}`} className="flex flex-col items-center gap-2">
                <CardComponent card={t.card} className="scale-90" />
                <span className="font-body text-sm text-gold/80">{t.playerName}</span>
              </div>
            ))
          ) : (
            <p className="font-body text-gold/70">Nessuna presa precedente disponibile.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
