import type { Card, TressettePlayerInfo } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardComponent } from '@/components/game/CardComponent';
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

interface FloatingAnnouncement {
  id: string;
  text: string;
  ts: number;
}

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
  const [announcements, setAnnouncements] = useState<FloatingAnnouncement[]>([]);
  const prevDeclCountRef = useRef(0);
  const pendingDecls = useGameStore((s) => s.pendingDeclarations);
  const [drawnCardsDisplay, setDrawnCardsDisplay] = useState<{ playerId: string; playerName: string; card: Card }[] | null>(null);
  const prevDrawnRef = useRef<string | null>(null);

  const players = client?.players ?? [];
  const numPlayers = Math.max(players.length, 2);
  const isSpectator = client?.myIndex === -1 || (client as unknown as { spectator?: boolean })?.spectator === true;

  const mePlayer = client && !isSpectator ? players[client.myIndex] : undefined;
  const mySeat = mePlayer?.seatIndex ?? 0;
  const myTeam = mePlayer?.team ?? 0;

  const currentPlayer = client ? players[client.currentPlayerIndex] : undefined;
  const currentSeat = currentPlayer?.seatIndex ?? -1;

  const myTurn = useMemo(() => {
    if (isSpectator || !client || !mePlayer || !currentPlayer) return false;
    return mePlayer.id === currentPlayer.id;
  }, [isSpectator, client, mePlayer, currentPlayer]);

  const teamANames = players.filter((p) => p.team === 0).map((p) => p.name);
  const teamBNames = players.filter((p) => p.team === 1).map((p) => p.name);

  const availableDeclarations = useMemo(() => {
    if (!client || !client.canDeclare) return [];
    return (client as unknown as { availableDeclarations?: string[] }).availableDeclarations ?? [];
  }, [client]);

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

  useEffect(() => {
    const decls = client?.declarations ?? [];
    if (decls.length > prevDeclCountRef.current) {
      const newDecls = decls.slice(prevDeclCountRef.current);
      const newAnnouncements = newDecls.map((d) => {
        const pName = players.find((p) => p.id === d.playerId)?.name ?? '?';
        const label = d.type === OG.TressetteDeclarationType.NAPOLETANA ? 'Napoletana' : 'Buon gioco';
        return {
          id: `${d.playerId}-${d.type}-${Date.now()}`,
          text: `${pName}: ${label}! (+${d.points} pt)`,
          ts: Date.now(),
        };
      });
      setAnnouncements((prev) => [...prev, ...newAnnouncements]);
      for (const a of newAnnouncements) {
        setTimeout(() => {
          setAnnouncements((prev) => prev.filter((x) => x.id !== a.id));
        }, 4000);
      }
    }
    prevDeclCountRef.current = decls.length;
  }, [client?.declarations, players]);

  useEffect(() => {
    if (!client?.drawnCards || client.drawnCards.length === 0) {
      prevDrawnRef.current = null;
      return;
    }
    const key = client.drawnCards.map((d) => d.card.id).join(',');
    if (key === prevDrawnRef.current) return;
    prevDrawnRef.current = key;
    const enriched = client.drawnCards.map((d) => ({
      ...d,
      playerName: players.find((p) => p.id === d.playerId)?.name ?? '?',
    }));
    setDrawnCardsDisplay(enriched);
    const tid = window.setTimeout(() => setDrawnCardsDisplay(null), 2500);
    return () => window.clearTimeout(tid);
  }, [client?.drawnCards, players]);

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

  const iWon = client.status === OG.GameStatus.FINISHED && !isSpectator && mePlayer
    ? client.teamScores[myTeam] > client.teamScores[myTeam === 0 ? 1 : 0]
    : false;
  const isDraw = client.status === OG.GameStatus.FINISHED
    ? client.teamScores[0] === client.teamScores[1]
    : false;

  const center = (
    <div className="flex max-w-full flex-col items-center gap-2 overflow-hidden px-1 sm:gap-4 sm:px-0">
      <TrickArea
        trick={client.currentTrick}
        mySeatIndex={mySeat}
        numPlayers={numPlayers}
        trickWinnerSeat={trickWinnerSeat}
      />
      {(() => {
        const pendingTypes = new Set(pendingDecls.map((d) => d.type));
        const remaining = availableDeclarations.filter((t) => !pendingTypes.has(t as OG.TressetteDeclarationType));
        return client.canDeclare && remaining.length > 0 ? (
          <GlassPanel className="flex max-w-full flex-wrap items-center justify-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
            <span className="mb-1 w-full text-center font-display text-sm text-gold sm:text-base">Dichiarazioni</span>
            {remaining.includes(OG.TressetteDeclarationType.NAPOLETANA) && (
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={() => sendDeclaration(OG.TressetteDeclarationType.NAPOLETANA, [])}
              >
                Napoletana
              </Button>
            )}
            {remaining.includes(OG.TressetteDeclarationType.BONGIOCO) && (
              <Button
                type="button"
                variant="ghost"
                className="text-xs"
                onClick={() => sendDeclaration(OG.TressetteDeclarationType.BONGIOCO, [])}
              >
                Buon gioco
              </Button>
            )}
          </GlassPanel>
        ) : null;
      })()}
      {pendingDecls.length > 0 && (
        <motion.div
          className="max-w-[min(100%,18rem)] rounded-full bg-gradient-to-r from-gold/80 to-amber-500/80 px-3 py-1.5 text-center font-display text-xs font-bold text-black shadow-lg sm:max-w-none sm:px-5 sm:py-2 sm:text-sm"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {pendingDecls.map((d) => d.type === OG.TressetteDeclarationType.NAPOLETANA ? 'Napoletana' : 'Buon gioco').join(' + ')} — gioca una carta!
        </motion.div>
      )}
    </div>
  );

  return (
    <div
      className={`mx-auto flex max-w-6xl flex-col gap-3 overflow-x-hidden px-2 pt-3 sm:gap-6 sm:px-3 sm:pt-4 md:px-4 ${isSpectator ? 'pb-6 sm:pb-8' : 'pb-20 sm:pb-28'}`}
    >
      {/* Declaration announcements */}
      <div className="pointer-events-none fixed left-1/2 top-16 z-[60] w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 px-2 sm:top-24 sm:w-auto sm:max-w-none sm:px-0">
        <AnimatePresence>
          {announcements.map((a) => (
            <motion.div
              key={a.id}
              className="mb-2 rounded-full bg-gradient-to-r from-gold/90 to-amber-500/90 px-3 py-1.5 text-center font-display text-xs font-bold tracking-wide text-black shadow-xl shadow-gold/30 sm:mb-3 sm:whitespace-nowrap sm:px-6 sm:py-2 sm:text-sm"
              initial={{ opacity: 0, y: -30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {a.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Drawn cards overlay (2-player mode) */}
      <AnimatePresence>
        {drawnCardsDisplay && (
          <motion.div
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex flex-col items-center gap-6"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <p className="px-2 text-center font-display text-xl text-gold sm:text-2xl">Carte pescate</p>
              <div className="flex max-w-full flex-wrap items-center justify-center gap-6 px-2 sm:gap-10">
                {drawnCardsDisplay.map((d) => (
                  <div key={d.card.id} className="flex flex-col items-center gap-2 sm:gap-3">
                    <div className="origin-center scale-[0.82] sm:scale-100">
                      <CardComponent card={d.card} width={100} height={142} disabled />
                    </div>
                    <span className="max-w-[10rem] truncate text-center font-display text-xs text-ivory/90 sm:max-w-none sm:text-sm">
                      {d.playerName}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <GlassPanel className="flex items-center justify-center gap-2 px-3 py-2 text-center sm:px-4">
          <Eye className="h-4 w-4 shrink-0 text-gold/70" />
          <span className="font-display text-xs leading-snug text-gold/80 sm:text-sm">
            Stai guardando la partita come spettatore
          </span>
        </GlassPanel>
      )}
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <ScoreBoard
          teamA={client.teamScores[0]}
          teamB={client.teamScores[1]}
          teamANames={teamANames}
          teamBNames={teamBNames}
          roundLabel={`Mano ${client.handNumber}`}
          handLabel={`Modalità ${client.mode}`}
          targetScore={client.targetScore}
        />
        <GlassPanel className="min-w-0 px-3 py-2 font-body text-xs text-gold/80 sm:px-4 sm:text-sm">
          <span className="font-display text-gold">Tressette</span>
          {client.mode === OG.TressetteMode.TWO_PLAYERS && (
            <>
              {' '}
              <span className="block sm:inline">— mazzo residuo: {client.deckRemaining}</span>
            </>
          )}
        </GlassPanel>
      </div>

      {client.mortoHand && client.mortoHand.length > 0 && (
        <GlassPanel className="max-w-full overflow-hidden px-3 py-2 sm:px-4 sm:py-3">
          <p className="mb-2 text-center font-display text-xs text-gold sm:text-sm">
            Carte del Morto ({client.mortoHand.length})
          </p>
          <div className="flex max-w-full flex-wrap justify-center gap-0.5 sm:gap-1">
            {client.mortoHand.map((card) => (
              <div key={card.id} className="origin-top shrink-0 scale-[0.88] sm:scale-100">
                <CardComponent card={card} width={56} height={80} disabled />
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

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
            {!isSpectator && mePlayer && (
              <div className="mb-4 flex items-center justify-center gap-3">
                <Trophy className={`h-10 w-10 ${iWon ? 'text-gold' : 'text-gold/30'}`} />
                <p className={`font-display text-3xl md:text-4xl ${iWon ? 'text-emerald-400' : isDraw ? 'text-gold' : 'text-red-400'}`}>
                  {isDraw ? 'Pareggio!' : iWon ? 'Hai vinto!' : 'Hai perso!'}
                </p>
                <Trophy className={`h-10 w-10 ${iWon ? 'text-gold' : 'text-gold/30'}`} />
              </div>
            )}
            <p className="font-display text-4xl text-gradient-gold md:text-5xl">Partita terminata</p>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="font-body text-xs uppercase tracking-wider text-gold/60">Squadra A</p>
                <p className="font-display text-3xl text-ivory">{Math.round(client.teamScores[0])}</p>
              </div>
              <p className="font-display text-2xl text-gold/40">—</p>
              <div className="text-center">
                <p className="font-body text-xs uppercase tracking-wider text-gold/60">Squadra B</p>
                <p className="font-display text-3xl text-ivory">{Math.round(client.teamScores[1])}</p>
              </div>
            </div>
            {!isSpectator && mePlayer && (
              <p className="mt-2 font-body text-sm text-gold/60">
                Tu eri nella <span className="font-display text-gold">{myTeam === 0 ? 'Squadra A' : 'Squadra B'}</span>
              </p>
            )}
            <Link to="/lobby">
              <Button type="button" variant="primary" className="mt-6 text-lg">
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
              className="fixed bottom-0 left-0 right-0 z-40 flex justify-center overflow-x-hidden pb-3 pt-6 sm:pb-6 sm:pt-10"
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
