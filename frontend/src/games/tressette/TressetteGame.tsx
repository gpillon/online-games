import type { TressettePlayerInfo } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameTable, type TableSeat } from '@/components/game/GameTable';
import { OpponentHand } from '@/components/game/OpponentHand';
import { PlayerHand } from '@/components/game/PlayerHand';
import { PlayerPlate } from '@/components/game/PlayerPlate';
import { ScoreBoard } from '@/components/game/ScoreBoard';
import { TrickArea } from '@/components/game/TrickArea';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import type { GameViewProps } from '@/games/registry';
import {
  playCardSound,
  playGameEndSound,
  playGameStartSound,
  playYourTurnSound,
} from '@/lib/sounds';
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
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const prevMyTurnRef = useRef(false);
  const playedEndSoundRef = useRef(false);

  const players = client?.players ?? [];
  const numPlayers = Math.max(players.length, 2);
  const isSpectator = client?.myIndex === -1 || (client as unknown as { spectator?: boolean })?.spectator === true;

  const mePlayer = client && !isSpectator ? players[client.myIndex] : undefined;
  const mySeat = mePlayer?.seatIndex ?? 0;

  const currentPlayer = client ? players[client.currentPlayerIndex] : undefined;
  const currentSeat = currentPlayer?.seatIndex ?? -1;

  const myTurn = useMemo(() => {
    if (isSpectator || !client || !mePlayer || !currentPlayer) return false;
    return mePlayer.id === currentPlayer.id;
  }, [isSpectator, client, mePlayer, currentPlayer]);

  const teamANames = players.filter((p) => p.team === 0).map((p) => p.name);
  const teamBNames = players.filter((p) => p.team === 1).map((p) => p.name);

  useEffect(() => {
    if (!client) return;
    setShowStartOverlay(true);
    playGameStartSound();
    const id = window.setTimeout(() => setShowStartOverlay(false), 2000);
    return () => window.clearTimeout(id);
  }, [client?.gameId]);

  useEffect(() => {
    if (!client) {
      playedEndSoundRef.current = false;
      return;
    }
    if (client.status !== OG.GameStatus.FINISHED) {
      playedEndSoundRef.current = false;
      return;
    }
    if (!playedEndSoundRef.current) {
      playGameEndSound();
      playedEndSoundRef.current = true;
    }
  }, [client]);

  useEffect(() => {
    if (myTurn && !prevMyTurnRef.current) {
      playYourTurnSound();
    }
    prevMyTurnRef.current = myTurn;
  }, [myTurn]);

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

  const trickWinnerSeat = client.trickWinner
    ? players.find((p) => p.id === client.trickWinner)?.seatIndex
    : undefined;

  const center = (
    <div className="flex flex-col items-center gap-4">
      <TrickArea
        trick={client.currentTrick}
        mySeatIndex={mySeat}
        numPlayers={numPlayers}
        trickWinnerSeat={trickWinnerSeat}
      />
      {client.canDeclare && (
        <GlassPanel className="flex flex-wrap items-center justify-center gap-4 px-6 py-4">
          <span className="mb-1 w-full text-center font-display text-base text-gold">Dichiarazioni</span>
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
    <div className={`mx-auto flex max-w-6xl flex-col gap-6 px-3 pt-4 md:px-4 ${isSpectator ? 'pb-8' : 'pb-28'}`}>
      <AnimatePresence>
        {showStartOverlay && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <p className="font-display text-5xl text-gradient-gold md:text-6xl">Tressette</p>
              <p className="mt-3 font-body text-lg text-gold/70">Modalità {client.mode}</p>
              <p className="mt-1 font-body text-sm text-gold/50">Buona fortuna!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isSpectator && (
        <GlassPanel className="flex items-center justify-center gap-2 px-4 py-2 text-center">
          <Eye className="h-4 w-4 text-gold/70" />
          <span className="font-display text-sm text-gold/80">Stai guardando la partita come spettatore</span>
        </GlassPanel>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <ScoreBoard
          teamA={client.teamScores[0]}
          teamB={client.teamScores[1]}
          teamANames={teamANames}
          teamBNames={teamBNames}
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

      {client.status === OG.GameStatus.FINISHED && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="text-center"
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          >
            <p className="font-display text-5xl text-gradient-gold md:text-6xl">Partita terminata!</p>
            <p className="mt-4 font-body text-xl text-ivory">
              {client.teamScores[0]} — {client.teamScores[1]}
            </p>
            <Link to="/lobby">
              <Button type="button" variant="primary" className="mt-6">
                Torna alla sala
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      )}

      {!isSpectator && (
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
                  playCardSound();
                  playCard(c.id);
                  window.setTimeout(() => setSelectedId(null), 320);
                }}
                validCardIds={validCardIds}
                myTurn={myTurn}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
