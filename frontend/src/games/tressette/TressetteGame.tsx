import type { TressettePlayerInfo } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { GameTable, type TableSeat } from '@/components/game/GameTable';
import { OpponentHand } from '@/components/game/OpponentHand';
import { PlayerHand } from '@/components/game/PlayerHand';
import { PlayerPlate } from '@/components/game/PlayerPlate';
import { ScoreBoard } from '@/components/game/ScoreBoard';
import { TrickArea } from '@/components/game/TrickArea';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import type { GameViewProps } from '@/games/registry';
import { useGameStore } from '@/stores/gameStore';

function playerBySeat(players: TressettePlayerInfo[], seat: number | null) {
  if (seat === null) return undefined;
  return players.find((p) => p.seatIndex === seat);
}

export function TressetteGame({ gameId }: GameViewProps) {
  const client = useGameStore((s) => s.clientState);
  const validCardIds = useGameStore((s) => s.validCardIds);
  const playCard = useGameStore((s) => s.playCard);
  const sendDeclaration = useGameStore((s) => s.sendDeclaration);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const players = client?.players ?? [];
  const numPlayers = Math.max(players.length, 2);

  const mePlayer = client ? players[client.myIndex] ?? players[0] : undefined;
  const mySeat = mePlayer?.seatIndex ?? 0;

  const currentPlayer = client ? players[client.currentPlayerIndex] : undefined;
  const currentSeat = currentPlayer?.seatIndex ?? -1;

  const myTurn = useMemo(() => {
    if (!client || !mePlayer || !currentPlayer) return false;
    return mePlayer.id === currentPlayer.id;
  }, [client, mePlayer, currentPlayer]);

  if (!client) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <motion.div
          className="h-14 w-14 rounded-full border-2 border-gold/40 border-t-gold"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
        />
        <p className="font-display text-xl text-gold/90">Connessione al tavolo…</p>
        <p className="max-w-md text-center font-body text-gold/60">Partita {gameId}</p>
      </div>
    );
  }

  const statusPlaying =
    client.status === OG.GameStatus.IN_PROGRESS || client.status === 'in_progress';

  const center = (
    <div className="flex flex-col items-center gap-4">
      <TrickArea trick={client.currentTrick} mySeatIndex={mySeat} numPlayers={numPlayers} />
      {client.canDeclare && (
        <GlassPanel className="flex flex-wrap justify-center gap-2 p-3">
          <span className="w-full text-center font-display text-sm text-gold">Dichiarazioni</span>
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            onClick={() => sendDeclaration(OG.TressetteDeclarationType.NAPOLETANA, [])}
          >
            Napoletana
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-xs"
            onClick={() => sendDeclaration(OG.TressetteDeclarationType.BONGIOCO, [])}
          >
            Buon gioco
          </Button>
        </GlassPanel>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-3 pb-28 pt-4 md:px-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <ScoreBoard
          teamA={client.teamScores[0]}
          teamB={client.teamScores[1]}
          roundLabel={`Mano ${client.handNumber}`}
          handLabel={`Modalità ${client.mode}`}
          targetScore={client.targetScore}
        />
        <GlassPanel className="px-4 py-2 font-body text-sm text-gold/80">
          <span className="font-display text-gold">Tressette</span> — mazzo residuo: {client.deckRemaining}
        </GlassPanel>
      </div>

      <GameTable
        numPlayers={numPlayers}
        mySeatIndex={mySeat}
        center={center}
        renderSlot={(slot: TableSeat, seatIndex) => {
          const p = playerBySeat(players, seatIndex);
          if (!p) return null;
          const isTurn = p.seatIndex === currentSeat;
          if (slot === 'south') {
            return <PlayerPlate player={p} isTurn={isTurn} cardCount={client.myHand.length} compact />;
          }
          return (
            <div className="flex flex-col items-center gap-2">
              <OpponentHand
                count={p.cardCount}
                orientation={slot === 'north' ? 'top' : slot === 'west' ? 'left' : 'right'}
              />
              <PlayerPlate player={p} isTurn={isTurn} cardCount={p.cardCount} compact />
            </div>
          );
        }}
      />

      <AnimatePresence>
        {statusPlaying && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-6 pt-10"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            style={{
              background:
                'linear-gradient(to top, rgba(10,8,5,0.95) 0%, rgba(10,8,5,0.75) 40%, transparent 100%)',
            }}
          >
            <PlayerHand
              cards={client.myHand}
              selectedId={selectedId}
              onSelect={(c) => {
                setSelectedId(c.id);
                playCard(c.id);
                window.setTimeout(() => setSelectedId(null), 320);
              }}
              validCardIds={validCardIds}
              myTurn={myTurn}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
