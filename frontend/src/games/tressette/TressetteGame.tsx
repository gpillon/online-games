import type { Card, TressettePlayerInfo } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, RotateCcw, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useViewportWidth } from '@/hooks/useViewportWidth';
import {
  playCardSound,
  playDeclarationSound,
  playGameEndSound,
  playGameStartSound,
  playYourTurnSound,
} from '@/lib/sounds';
import { WS_EVENTS } from '@/lib/wsEvents';
import { getSocket } from '@/services/socket';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';

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
  const drawnTimerRef = useRef<number | null>(null);
  const [rematchAccepted, setRematchAccepted] = useState<string[]>([]);
  const [rematchNeeded, setRematchNeeded] = useState(0);
  const [rematchRequested, setRematchRequested] = useState(false);
  const currentRoom = useLobbyStore((s) => s.currentRoom);

  const vw = useViewportWidth();
  const isMobile = vw < 640;
  const players = client?.players ?? [];
  const numPlayers = Math.max(players.length, 2);
  const isSpectator = client?.myIndex === -1 || (client as unknown as { spectator?: boolean })?.spectator === true;

  const mePlayer = client && !isSpectator ? players[client.myIndex] : undefined;
  const mySeat = mePlayer?.seatIndex ?? 0;
  const myTeam = mePlayer?.team ?? 0;

  const isMortoTurn = !!(client as unknown as { isMortoTurn?: boolean })?.isMortoTurn;
  const currentSeat = client?.currentPlayerIndex ?? -1;
  const currentPlayer = players.find((p) => p.seatIndex === currentSeat);

  const myTurnForOwnHand = useMemo(() => {
    if (isSpectator || !client || !mePlayer) return false;
    if (isMortoTurn) return false;
    return currentPlayer ? mePlayer.id === currentPlayer.id : false;
  }, [isSpectator, client, mePlayer, currentPlayer, isMortoTurn]);

  const myTurn = useMemo(() => {
    if (isSpectator || !client || !mePlayer) return false;
    if (isMortoTurn) return mePlayer.seatIndex === client.dealer;
    return currentPlayer ? mePlayer.id === currentPlayer.id : false;
  }, [isSpectator, client, mePlayer, currentPlayer, isMortoTurn]);

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
      playDeclarationSound();
      const newAnnouncements = newDecls.map((d) => {
        const pName = players.find((p) => p.id === d.playerId)?.name ?? '?';
        const label = d.type === OG.TressetteDeclarationType.NAPOLETANA ? 'Napoletana' : 'Buon gioco';
        const detail = (d as unknown as { detail?: string }).detail;
        const detailStr = detail ? ` (${detail})` : '';
        return {
          id: `${d.playerId}-${d.type}-${Date.now()}`,
          text: `${pName}: ${label}${detailStr}! (+${d.points} pt)`,
          ts: Date.now(),
        };
      });
      setAnnouncements((prev) => [...prev, ...newAnnouncements]);
      for (const a of newAnnouncements) {
        setTimeout(() => {
          setAnnouncements((prev) => prev.filter((x) => x.id !== a.id));
        }, 5000);
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
    if (drawnTimerRef.current) window.clearTimeout(drawnTimerRef.current);
    drawnTimerRef.current = window.setTimeout(() => {
      setDrawnCardsDisplay(null);
      drawnTimerRef.current = null;
    }, 2500);
  }, [client?.drawnCards, players]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const handler = (data: { accepted: string[]; needed: number }) => {
      setRematchAccepted(data.accepted);
      setRematchNeeded(data.needed);
    };
    s.on(WS_EVENTS.GAME_REMATCH_STATUS, handler);
    return () => { s.off(WS_EVENTS.GAME_REMATCH_STATUS, handler); };
  }, []);

  useEffect(() => {
    if (client?.status !== OG.GameStatus.FINISHED) {
      setRematchRequested(false);
      setRematchAccepted([]);
      setRematchNeeded(0);
    }
  }, [client?.status]);

  const requestRematch = useCallback(() => {
    if (!currentRoom) return;
    getSocket()?.emit(WS_EVENTS.GAME_REMATCH_REQUEST, { roomId: currentRoom.id });
    setRematchRequested(true);
  }, [currentRoom]);

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
        const SUIT_LABELS: Record<string, string> = { bastoni: 'Bastoni', coppe: 'Coppe', denara: 'Denari', spade: 'Spade' };
        const RANK_LABELS: Record<number, string> = { 1: 'Assi', 2: 'Due', 3: 'Tre' };
        const hand = client.myHand;
        const pendingTypes = new Set(pendingDecls.map((d) => d.type));
        const remaining = availableDeclarations.filter((t) => !pendingTypes.has(t as OG.TressetteDeclarationType));
        if (!client.canDeclare || remaining.length === 0) return null;

        const napoOptions: { suit: string; label: string; ids: string[] }[] = [];
        if (remaining.includes(OG.TressetteDeclarationType.NAPOLETANA)) {
          const bySuit = new Map<string, typeof hand>();
          for (const c of hand) {
            const arr = bySuit.get(c.suit) ?? [];
            arr.push(c);
            bySuit.set(c.suit, arr);
          }
          for (const [suit, cards] of bySuit) {
            const ranks = new Set(cards.map((c) => c.rank));
            if (ranks.has(1) && ranks.has(2) && ranks.has(3)) {
              const trio = cards.filter((c) => [1, 2, 3].includes(c.rank)).slice(0, 3);
              napoOptions.push({ suit, label: SUIT_LABELS[suit] ?? suit, ids: trio.map((c) => c.id) });
            }
          }
        }

        const bongOptions: { rank: number; label: string; ids: string[] }[] = [];
        if (remaining.includes(OG.TressetteDeclarationType.BONGIOCO)) {
          for (const r of [1, 2, 3]) {
            const matching = hand.filter((c) => c.rank === r);
            if (matching.length >= 3) {
              bongOptions.push({ rank: r, label: RANK_LABELS[r] ?? String(r), ids: matching.slice(0, 3).map((c) => c.id) });
            }
          }
        }

        return (napoOptions.length > 0 || bongOptions.length > 0) ? (
          <GlassPanel className="flex max-w-full flex-wrap items-center justify-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
            <span className="mb-1 w-full text-center font-display text-sm text-gold sm:text-base">Dichiarazioni</span>
            {napoOptions.map((opt) => (
              <Button
                key={`napo-${opt.suit}`}
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={() => sendDeclaration(OG.TressetteDeclarationType.NAPOLETANA, opt.ids)}
              >
                Napoletana ({opt.label})
              </Button>
            ))}
            {bongOptions.map((opt) => (
              <Button
                key={`bong-${opt.rank}`}
                type="button"
                variant="ghost"
                className="text-xs"
                onClick={() => sendDeclaration(OG.TressetteDeclarationType.BONGIOCO, opt.ids)}
              >
                Buon gioco ({opt.label})
              </Button>
            ))}
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
      <div className="pointer-events-none fixed left-1/2 top-20 z-[60] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 sm:top-28 sm:max-w-2xl">
        <AnimatePresence>
          {announcements.map((a) => (
            <motion.div
              key={a.id}
              className="mb-3 rounded-2xl border-2 border-gold/60 bg-gradient-to-br from-amber-900/95 via-yellow-800/95 to-gold/90 px-6 py-4 text-center font-display text-lg font-bold tracking-wide text-white shadow-2xl shadow-gold/40 sm:mb-4 sm:px-10 sm:py-5 sm:text-2xl"
              initial={{ opacity: 0, y: -40, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: [1, 1.05, 1] }}
              exit={{ opacity: 0, y: -30, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 250, damping: 18 }}
            >
              {a.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Drawn cards banner (2-player mode) */}
      <AnimatePresence>
        {drawnCardsDisplay && (
          <motion.div
            className="pointer-events-none fixed left-1/2 top-16 z-[55] -translate-x-1/2"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <div className="flex items-center gap-4 rounded-2xl border border-gold/40 bg-black/80 px-5 py-3 shadow-2xl backdrop-blur-sm">
              <span className="font-display text-sm text-gold">Pescate:</span>
              {drawnCardsDisplay.map((d) => (
                <div key={d.card.id} className="flex items-center gap-2">
                  <CardComponent card={d.card} width={48} height={68} disabled />
                  <span className="font-display text-xs text-ivory/80">{d.playerName}</span>
                </div>
              ))}
            </div>
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

      {/* morto hand is shown at the morto seat on the table */}

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
          if (p.isMorto && client.mortoHand) {
            const mortoClickable = isMortoTurn && myTurn && statusPlaying;
            return (
              <div className="flex flex-col items-center gap-1">
                <div className="flex flex-wrap justify-center gap-0.5">
                  {client.mortoHand.map((card) => (
                    <div
                      key={card.id}
                      className={mortoClickable ? 'cursor-pointer transition-transform hover:-translate-y-1' : ''}
                      onClick={mortoClickable ? () => {
                        playCardSound();
                        playCard(card.id);
                      } : undefined}
                    >
                      <CardComponent card={card} width={44} height={63} disabled={!mortoClickable} />
                    </div>
                  ))}
                </div>
                <PlayerPlate player={p} isTurn={isTurn} cardCount={client.mortoHand.length} compact />
              </div>
            );
          }
          return (
            <div className="flex flex-col items-center gap-2">
              {!isMobile && (
                <OpponentHand
                  count={p.cardCount}
                  orientation={slot === 'north' ? 'top' : slot === 'west' ? 'left' : 'right'}
                />
              )}
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
            <div className="mt-6 flex flex-col items-center gap-3">
              {!isSpectator && (
                <div className="flex flex-col items-center gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-base"
                    disabled={rematchRequested}
                    onClick={requestRematch}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {rematchRequested ? 'In attesa…' : 'Rivincita'}
                  </Button>
                  {rematchNeeded > 0 && (
                    <p className="font-body text-xs text-gold/60">
                      {rematchAccepted.length}/{rematchNeeded} giocatori pronti
                    </p>
                  )}
                </div>
              )}
              <Link to="/lobby">
                <Button type="button" variant="primary" className="text-lg">
                  Torna alla sala
                </Button>
              </Link>
            </div>
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
                myTurn={myTurnForOwnHand}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
