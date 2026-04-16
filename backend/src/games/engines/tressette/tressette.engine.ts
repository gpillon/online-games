import {
  Card,
  GamePlayer,
  GameStatus,
  GameType,
  PlayerType,
  Rank,
  Suit,
  TRESSETTE_CARD_ORDER,
  TRESSETTE_CARD_POINTS,
  TrickCard,
  TressetteDeclaration,
  TressetteDeclarationType,
  TressetteGameState,
  TressetteMode,
  createDeck,
  shuffleDeck,
} from '@online-games/shared';
import {
  IGameEngine,
  MoveResult,
} from '../../interfaces/game-engine.interface';

type DeclarationPayload = {
  type: TressetteDeclarationType;
  cardIds: string[];
};

type TressettePlayMove = {
  type: 'play';
  cardId: string;
  declaration?: DeclarationPayload;
  declarations?: DeclarationPayload[];
};

function rankStrength(rank: Rank): number {
  const i = TRESSETTE_CARD_ORDER.indexOf(rank);
  return i === -1 ? 999 : i;
}

function cardPoints(card: Card): number {
  return TRESSETTE_CARD_POINTS[card.rank] ?? 0;
}

function trickPoints(cards: Card[]): number {
  return cards.reduce((s, c) => s + cardPoints(c), 0);
}

export interface TressetteEngineOptions {
  mode: TressetteMode;
  targetScore?: number;
}

export class TressetteEngine implements IGameEngine {
  private readonly gameId: string;
  private readonly mode: TressetteMode;
  private readonly targetScore: number;
  private players: GamePlayer[] = [];
  private status: GameStatus = GameStatus.WAITING;
  private hands: Record<string, Card[]> = {};
  private stock: Card[] = [];
  private mortoCard: Card | null = null;
  private currentTrick: TrickCard[] = [];
  private lastTrick: TrickCard[] | undefined;
  private tricksWon: Record<string, Card[][]> = {};
  private teamScores: [number, number] = [0, 0];
  private handStartScores: [number, number] = [0, 0];
  private declarations: TressetteDeclaration[] = [];
  private dealerSeat = 0;
  private currentSeat = 0;
  private handNumber = 0;
  private trickInHand = 0;
  private hasPlayedCardThisHand: Record<string, boolean> = {};
  private declaredThisHand: Record<string, Set<TressetteDeclarationType>> = {};
  private mortoHand: Card[] = [];
  private mortoPlayerId: string | null = null;
  private lastTrickWinnerPlayerId: string | null = null;
  private lastDrawnCards: { playerId: string; card: Card }[] = [];
  private createdAt = new Date().toISOString();

  constructor(gameId: string, options: TressetteEngineOptions) {
    this.gameId = gameId;
    this.mode = options.mode;
    this.targetScore = options.targetScore ?? 21;
  }

  /** Full server snapshot for persistence (includes fields not exposed via getState). */
  getPersistenceState(): Record<string, unknown> {
    return {
      gameType: GameType.TRESSETTE,
      gameId: this.gameId,
      mode: this.mode,
      targetScore: this.targetScore,
      players: this.players.map((p) => ({ ...p })),
      status: this.status,
      hands: { ...this.hands },
      stock: [...this.stock],
      mortoCard: this.mortoCard,
      currentTrick: this.currentTrick.map((t) => ({ ...t, card: { ...t.card } })),
      lastTrick: this.lastTrick?.map((t) => ({ ...t, card: { ...t.card } })),
      tricksWon: Object.fromEntries(
        Object.entries(this.tricksWon).map(([k, stacks]) => [
          k,
          stacks.map((stack) => stack.map((c) => ({ ...c }))),
        ]),
      ),
      teamScores: [...this.teamScores] as [number, number],
      handStartScores: [...this.handStartScores] as [number, number],
      declarations: this.declarations.map((d) => ({
        ...d,
        cards: d.cards.map((c) => ({ ...c })),
      })),
      dealerSeat: this.dealerSeat,
      currentSeat: this.currentSeat,
      handNumber: this.handNumber,
      trickInHand: this.trickInHand,
      hasPlayedCardThisHand: { ...this.hasPlayedCardThisHand },
      declaredThisHand: Object.fromEntries(
        Object.entries(this.declaredThisHand).map(([k, v]) => [k, [...v]]),
      ),
      mortoHand: this.mortoHand.map((c) => ({ ...c })),
      mortoPlayerId: this.mortoPlayerId,
      mortoSeatIndex: this.mortoSeatIndex,
      lastTrickWinnerPlayerId: this.lastTrickWinnerPlayerId,
      lastDrawnCards: this.lastDrawnCards.map((d) => ({ playerId: d.playerId, card: { ...d.card } })),
      createdAt: this.createdAt,
    };
  }

  static fromState(gameId: string, state: unknown): TressetteEngine {
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid Tressette engine state');
    }
    const s = state as Record<string, unknown>;
    const mode = s.mode as TressetteMode;
    const targetScore = typeof s.targetScore === 'number' ? s.targetScore : 21;
    const engine = new TressetteEngine(gameId, { mode, targetScore });
    engine.hydrateFromPersistence(s);
    return engine;
  }

  private hydrateFromPersistence(s: Record<string, unknown>): void {
    if (Array.isArray(s.players)) {
      this.players = (s.players as GamePlayer[]).map((p) => ({ ...p }));
    }
    if (typeof s.status === 'string') {
      this.status = s.status as GameStatus;
    }
    if (s.hands && typeof s.hands === 'object') {
      this.hands = { ...(s.hands as Record<string, Card[]>) };
    }
    if (Array.isArray(s.stock)) {
      this.stock = [...(s.stock as Card[])];
    }
    if (s.mortoCard === null || (s.mortoCard && typeof s.mortoCard === 'object')) {
      this.mortoCard = s.mortoCard as Card | null;
    }
    if (Array.isArray(s.currentTrick)) {
      this.currentTrick = [...(s.currentTrick as TrickCard[])];
    }
    if (s.lastTrick === undefined) {
      this.lastTrick = undefined;
    } else if (Array.isArray(s.lastTrick)) {
      this.lastTrick = [...(s.lastTrick as TrickCard[])];
    }
    if (s.tricksWon && typeof s.tricksWon === 'object') {
      const tw: Record<string, Card[][]> = {};
      for (const [pid, stacks] of Object.entries(s.tricksWon as Record<string, Card[][]>)) {
        tw[pid] = Array.isArray(stacks)
          ? stacks.map((stack) => (Array.isArray(stack) ? [...stack] : []))
          : [];
      }
      this.tricksWon = tw;
    }
    if (Array.isArray(s.teamScores) && s.teamScores.length === 2) {
      this.teamScores = [Number(s.teamScores[0]), Number(s.teamScores[1])];
    }
    if (Array.isArray(s.handStartScores) && s.handStartScores.length === 2) {
      this.handStartScores = [Number(s.handStartScores[0]), Number(s.handStartScores[1])];
    }
    if (Array.isArray(s.declarations)) {
      this.declarations = (s.declarations as TressetteDeclaration[]).map((d) => ({
        ...d,
        cards: Array.isArray(d.cards) ? [...d.cards] : [],
      }));
    }
    if (typeof s.dealerSeat === 'number') this.dealerSeat = s.dealerSeat;
    if (typeof s.currentSeat === 'number') this.currentSeat = s.currentSeat;
    if (typeof s.handNumber === 'number') this.handNumber = s.handNumber;
    if (typeof s.trickInHand === 'number') this.trickInHand = s.trickInHand;
    if (s.hasPlayedCardThisHand && typeof s.hasPlayedCardThisHand === 'object') {
      this.hasPlayedCardThisHand = { ...(s.hasPlayedCardThisHand as Record<string, boolean>) };
    }
    if (s.declaredThisHand && typeof s.declaredThisHand === 'object') {
      this.declaredThisHand = {};
      for (const [k, v] of Object.entries(s.declaredThisHand as Record<string, string[]>)) {
        this.declaredThisHand[k] = new Set(v as TressetteDeclarationType[]);
      }
    } else if (Array.isArray(s.declaredPlayers)) {
      this.declaredThisHand = {};
      for (const pid of s.declaredPlayers as string[]) {
        this.declaredThisHand[pid] = new Set([TressetteDeclarationType.NAPOLETANA, TressetteDeclarationType.BONGIOCO]);
      }
    }
    if (Array.isArray(s.mortoHand)) {
      this.mortoHand = (s.mortoHand as Card[]).map((c) => ({ ...c }));
    }
    if (s.mortoPlayerId === null || typeof s.mortoPlayerId === 'string') {
      this.mortoPlayerId = s.mortoPlayerId as string | null;
    }
    if (s.mortoSeatIndex === null || typeof s.mortoSeatIndex === 'number') {
      this.mortoSeatIndex = s.mortoSeatIndex as number | null;
    }
    if (s.lastTrickWinnerPlayerId === null || typeof s.lastTrickWinnerPlayerId === 'string') {
      this.lastTrickWinnerPlayerId = s.lastTrickWinnerPlayerId as string | null;
    }
    if (Array.isArray(s.lastDrawnCards)) {
      this.lastDrawnCards = (s.lastDrawnCards as { playerId: string; card: Card }[]).map((d) => ({
        playerId: d.playerId,
        card: { ...d.card },
      }));
    }
    if (typeof s.createdAt === 'string') {
      this.createdAt = s.createdAt;
    }
  }

  getGameId(): string {
    return this.gameId;
  }

  addPlayer(player: GamePlayer): void {
    if (this.status !== GameStatus.WAITING) {
      throw new Error('Game already started');
    }
    const max = this.maxPlayers();
    if (this.players.length >= max) {
      throw new Error('Room is full');
    }
    this.players.push({ ...player, connected: true });
    this.players.sort((a, b) => a.seatIndex - b.seatIndex);
  }

  start(): void {
    const max = this.maxPlayers();
    if (this.players.length !== max) {
      throw new Error(`Need ${max} players to start`);
    }
    this.assignTeams();
    this.status = GameStatus.IN_PROGRESS;
    this.handNumber = 1;
    this.dealHand();
  }

  getCurrentPlayerId(): string {
    if (this.isMortoSeat(this.currentSeat)) {
      const dealer = this.playerAtSeat(this.dealerSeat);
      return dealer.id;
    }
    return this.playerAtSeat(this.currentSeat).id;
  }

  isMortoTurn(): boolean {
    return this.isMortoSeat(this.currentSeat);
  }

  private isMortoSeat(seat: number): boolean {
    return (
      this.mode === TressetteMode.THREE_WITH_MORTO &&
      this.mortoPlayerId !== null &&
      this.mortoSeatIndex !== null &&
      seat === this.mortoSeatIndex
    );
  }

  private mortoSeatIndex: number | null = null;

  isGameOver(): boolean {
    return this.status === GameStatus.FINISHED;
  }

  getResults(): {
    gameId: string;
    winningTeam: number;
    teamScores: [number, number];
    players: GamePlayer[];
  } {
    const winningTeam = this.teamScores[0] >= this.teamScores[1] ? 0 : 1;
    return {
      gameId: this.gameId,
      winningTeam,
      teamScores: this.teamScores,
      players: this.players,
    };
  }

  getState(): TressetteGameState {
    const scores: Record<string, number> = {};
    for (const p of this.players) {
      scores[p.id] = 0;
    }
    return {
      gameId: this.gameId,
      gameType: GameType.TRESSETTE,
      status: this.status,
      players: this.players,
      currentPlayerIndex: this.currentSeat,
      scores,
      round: this.handNumber,
      createdAt: this.createdAt,
      hands: this.hands,
      currentTrick: this.currentTrick,
      trickWinner: this.lastTrickWinnerId(),
      teamScores: this.teamScores,
      tricksWon: this.tricksWon,
      deckRemaining: this.stock.length,
      mode: this.mode,
      dealer: this.dealerSeat,
      trumpSuit: null,
      lastTrick: this.lastTrick,
      declarations: [...this.declarations],
      handNumber: this.handNumber,
      targetScore: this.targetScore,
    };
  }

  getClientState(playerId: string): unknown {
    const my = this.players.find((p) => p.id === playerId);
    if (!my) {
      return { error: 'not_in_game' };
    }
    const others = this.buildPlayersInfo();
    return {
      gameId: this.gameId,
      myHand: [...(this.hands[playerId] ?? [])],
      currentTrick: this.currentTrick,
      lastTrick: this.lastTrick,
      currentPlayerIndex: this.currentSeat,
      myIndex: my.seatIndex,
      players: others,
      teamScores: this.teamScores,
      deckRemaining: this.stock.length,
      status: this.status,
      mode: this.mode,
      dealer: this.dealerSeat,
      handNumber: this.handNumber,
      targetScore: this.targetScore,
      trickWinner: this.lastTrickWinnerId(),
      declarations: [...this.declarations],
      canDeclare:
        !this.hasPlayedCardThisHand[playerId] &&
        this.trickInHand < 3 &&
        this.computeAvailableDeclarations(playerId).length > 0,
      availableDeclarations: this.computeAvailableDeclarations(playerId),
      mortoHand:
        this.mode === TressetteMode.THREE_WITH_MORTO
          ? [...(this.hands[this.mortoPlayerId ?? ''] ?? this.mortoHand)]
          : undefined,
      mortoSeatIndex:
        this.mode === TressetteMode.THREE_WITH_MORTO
          ? this.mortoSeatIndex
          : undefined,
      isMortoTurn: this.isMortoTurn(),
      drawnCards:
        this.mode === TressetteMode.TWO_PLAYERS && this.lastDrawnCards.length > 0
          ? this.lastDrawnCards.map((d) => ({ playerId: d.playerId, card: { ...d.card } }))
          : undefined,
    };
  }

  private computeAvailableDeclarations(playerId: string): TressetteDeclarationType[] {
    if (this.hasPlayedCardThisHand[playerId] || this.trickInHand >= 3) {
      return [];
    }
    const already = this.declaredThisHand[playerId] ?? new Set();
    const hand = this.hands[playerId] ?? [];
    if (hand.length === 0) return [];
    const available: TressetteDeclarationType[] = [];

    if (!already.has(TressetteDeclarationType.NAPOLETANA)) {
      const bySuit = new Map<Suit, Card[]>();
      for (const c of hand) {
        const arr = bySuit.get(c.suit) ?? [];
        arr.push(c);
        bySuit.set(c.suit, arr);
      }
      for (const cards of bySuit.values()) {
        const ranks = new Set(cards.map((c) => c.rank));
        if (ranks.has(Rank.ASSO) && ranks.has(Rank.DUE) && ranks.has(Rank.TRE)) {
          available.push(TressetteDeclarationType.NAPOLETANA);
          break;
        }
      }
    }

    if (!already.has(TressetteDeclarationType.BONGIOCO)) {
      for (const r of [Rank.ASSO, Rank.DUE, Rank.TRE]) {
        if (hand.filter((c) => c.rank === r).length >= 3) {
          available.push(TressetteDeclarationType.BONGIOCO);
          break;
        }
      }
    }

    return available;
  }

  isValidMove(playerId: string, move: unknown): boolean {
    const res = this.makeMove(playerId, move, true);
    return res.success;
  }

  makeMove(playerId: string, move: unknown, dryRun = false): MoveResult {
    try {
      return this.applyMove(playerId, move, dryRun);
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  }

  private applyMove(
    playerId: string,
    move: unknown,
    dryRun: boolean,
  ): MoveResult {
    if (this.status !== GameStatus.IN_PROGRESS) {
      return { success: false, error: 'Game not in progress' };
    }
    if (this.getCurrentPlayerId() !== playerId) {
      return { success: false, error: 'Not your turn' };
    }
    if (!move || typeof move !== 'object') {
      return { success: false, error: 'Invalid move payload' };
    }
    const m = move as TressettePlayMove;
    if (m.type !== 'play' || typeof m.cardId !== 'string') {
      return { success: false, error: 'Unsupported move' };
    }

    const playingMorto = this.isMortoTurn();
    const effectiveHandId = playingMorto ? this.mortoPlayerId! : playerId;
    const hand = this.hands[effectiveHandId];
    if (!hand) return { success: false, error: 'No hand' };

    const cardIndex = hand.findIndex((c) => c.id === m.cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in hand' };
    }
    const card = hand[cardIndex];

    const ledSuit = this.currentTrick[0]?.card.suit;
    if (ledSuit) {
      const hasLed = hand.some((c) => c.suit === ledSuit);
      if (hasLed && card.suit !== ledSuit) {
        return { success: false, error: 'Must follow suit' };
      }
    }

    const declHand = this.hands[playerId] ?? [];
    const allDecls: DeclarationPayload[] = [
      ...(m.declarations ?? []),
      ...(m.declaration ? [m.declaration] : []),
    ];
    for (const decl of allDecls) {
      if (!decl.cardIds || decl.cardIds.length === 0) {
        decl.cardIds = this.autoSelectDeclarationCards(decl.type, declHand);
      }
      const declErr = this.validateDeclaration(playerId, decl, declHand);
      if (declErr) return { success: false, error: declErr };
    }

    if (dryRun) {
      return { success: true };
    }

    this.lastDrawnCards = [];

    for (const decl of allDecls) {
      this.recordDeclaration(playerId, decl, declHand);
      if (!this.declaredThisHand[playerId]) {
        this.declaredThisHand[playerId] = new Set();
      }
      this.declaredThisHand[playerId].add(decl.type);
    }

    hand.splice(cardIndex, 1);
    if (playingMorto) {
      this.mortoHand = [...hand];
    }
    const trickPlayerId = playingMorto ? this.mortoPlayerId! : playerId;
    const trickSeat = playingMorto ? this.mortoSeatIndex! : this.players.find((p) => p.id === playerId)!.seatIndex;
    const dealer = this.players.find((p) => p.seatIndex === this.dealerSeat);
    const trickName = playingMorto ? `Morto (${dealer?.name ?? '?'})` : this.players.find((p) => p.id === playerId)!.name;
    this.currentTrick.push({
      card,
      playerId: trickPlayerId,
      playerName: trickName,
      seatIndex: trickSeat,
    });
    this.hasPlayedCardThisHand[playerId] = true;

    const expected = this.trickSize();
    if (this.currentTrick.length < expected) {
      this.advanceTurn();
      return {
        success: true,
        nextPlayerId: this.getCurrentPlayerId(),
        stateUpdate: this.getClientState(playerId),
      };
    }

    const winner = this.resolveTrickWinner();
    this.lastTrickWinnerPlayerId = winner.id;
    const trickCards = this.currentTrick.map((t) => t.card);
    this.awardTrick(winner.id, trickCards);
    const trickWinnerPayload = {
      playerId: winner.id,
      cards: this.currentTrick.map((t) => t.card),
    };
    this.lastTrick = [...this.currentTrick];
    this.currentTrick = [];
    this.trickInHand += 1;
    this.currentSeat = winner.seatIndex;

    if (this.mode === TressetteMode.TWO_PLAYERS) {
      this.drawFromStock(winner.id);
    }

    const handComplete = this.isHandComplete();
    let gameOver = false;
    if (handComplete) {
      this.finishHand();
      gameOver = this.checkGameEnd();
      if (!gameOver) {
        this.handNumber += 1;
        this.dealerSeat = this.nextDealerSeat();
        this.dealHand();
      }
    }

    if (gameOver) {
      this.status = GameStatus.FINISHED;
    }

    return {
      success: true,
      trickComplete: true,
      trickWinner: trickWinnerPayload,
      handComplete,
      gameOver,
      nextPlayerId: this.isGameOver() ? undefined : this.getCurrentPlayerId(),
      stateUpdate: this.getClientState(playerId),
    };
  }

  private lastTrickWinnerId(): string | undefined {
    return this.lastTrick?.length
      ? this.resolveTrickWinnerFrom(this.lastTrick).id
      : undefined;
  }

  private maxPlayers(): number {
    switch (this.mode) {
      case TressetteMode.TWO_PLAYERS:
        return 2;
      case TressetteMode.THREE_WITH_MORTO:
        return 3;
      case TressetteMode.FOUR_PLAYERS:
        return 4;
      default:
        return 4;
    }
  }

  private assignTeams(): void {
    if (this.mode === TressetteMode.THREE_WITH_MORTO) {
      for (const p of this.players) {
        p.team = p.seatIndex === this.dealerSeat ? 0 : 1;
      }
    } else if (this.mode === TressetteMode.FOUR_PLAYERS) {
      for (const p of this.players) {
        p.team = p.seatIndex % 2 === 0 ? 0 : 1;
      }
    } else {
      for (const p of this.players) {
        p.team = p.seatIndex;
      }
    }
  }

  private teamIndexForSeat(seat: number): 0 | 1 {
    const p = this.playerAtSeat(seat);
    return (p.team ?? 0) as 0 | 1;
  }

  private playerAtSeat(seat: number): GamePlayer {
    if (this.isMortoSeat(seat)) {
      const dealer = this.players.find((p) => p.seatIndex === this.dealerSeat);
      if (!dealer) throw new Error('Dealer not found');
      return dealer;
    }
    const p = this.players.find((x) => x.seatIndex === seat);
    if (!p) throw new Error(`Invalid seat ${seat}`);
    return p;
  }

  private dealHand(): void {
    this.currentTrick = [];
    this.trickInHand = 0;
    this.hasPlayedCardThisHand = {};
    this.declaredThisHand = {};
    this.lastDrawnCards = [];
    this.handStartScores = [...this.teamScores] as [number, number];
    for (const p of this.players) {
      this.tricksWon[p.id] = this.tricksWon[p.id] ?? [];
    }

    const deck = shuffleDeck(createDeck());
    this.stock = [];
    this.mortoCard = null;
    this.mortoHand = [];
    this.mortoPlayerId = null;

    if (this.mode === TressetteMode.TWO_PLAYERS) {
      for (const p of this.players) {
        this.hands[p.id] = deck.splice(0, 10);
      }
      this.stock = deck;
    } else if (this.mode === TressetteMode.THREE_WITH_MORTO) {
      const dealer = this.playerAtSeat(this.dealerSeat);
      this.mortoPlayerId = `morto_${dealer.id}`;
      const usedSeats = new Set(this.players.map((p) => p.seatIndex));
      let mSeat = 0;
      for (let s = 0; s < 4; s++) {
        if (!usedSeats.has(s)) { mSeat = s; break; }
      }
      this.mortoSeatIndex = mSeat;
      for (const p of this.players) {
        p.team = p.id === dealer.id ? 0 : 1;
        this.hands[p.id] = deck.splice(0, 10);
      }
      this.mortoHand = deck.splice(0, 10);
      this.hands[this.mortoPlayerId] = this.mortoHand;
    } else {
      for (const p of this.players) {
        this.hands[p.id] = deck.splice(0, 10);
      }
    }

    this.currentSeat = (this.dealerSeat + 1) % this.seatCount();
  }

  private nextDealerSeat(): number {
    if (this.mode === TressetteMode.THREE_WITH_MORTO) {
      const playerSeats = this.players.map((p) => p.seatIndex).sort((a, b) => a - b);
      const curIdx = playerSeats.indexOf(this.dealerSeat);
      return playerSeats[(curIdx + 1) % playerSeats.length];
    }
    return (this.dealerSeat + 1) % this.players.length;
  }

  private trickSize(): number {
    return this.mode === TressetteMode.THREE_WITH_MORTO ? 4 : this.players.length;
  }

  private seatCount(): number {
    return this.mode === TressetteMode.THREE_WITH_MORTO ? 4 : this.players.length;
  }

  private advanceTurn(): void {
    this.currentSeat = (this.currentSeat + 1) % this.seatCount();
  }

  private resolveTrickWinner(): { id: string; seatIndex: number } {
    return this.resolveTrickWinnerFrom(this.currentTrick);
  }

  private resolveTrickWinnerFrom(trick: TrickCard[]): { id: string; seatIndex: number } {
    const led = trick[0].card.suit;
    const contenders = trick.filter((t) => t.card.suit === led);
    let best = contenders[0];
    for (const t of contenders.slice(1)) {
      const a = best.card;
      const b = t.card;
      if (rankStrength(b.rank) < rankStrength(a.rank)) {
        best = t;
      }
    }
    return { id: best.playerId, seatIndex: best.seatIndex };
  }

  private awardTrick(winnerId: string, cards: Card[]): void {
    if (!this.tricksWon[winnerId]) this.tricksWon[winnerId] = [];
    this.tricksWon[winnerId].push(cards);
    const pts = trickPoints(cards);
    if (this.mortoPlayerId && winnerId === this.mortoPlayerId) {
      const dealerTeam = this.teamIndexForSeat(this.dealerSeat);
      this.teamScores[dealerTeam] += pts;
    } else {
      const winner = this.players.find((p) => p.id === winnerId);
      if (winner) {
        const team = this.teamIndexForSeat(winner.seatIndex);
        this.teamScores[team] += pts;
      }
    }
  }

  private drawFromStock(winnerId: string): void {
    this.lastDrawnCards = [];
    if (this.stock.length === 0) return;
    const loser = this.players.find((p) => p.id !== winnerId)!;
    const drawOrder = [winnerId, loser.id];
    for (const pid of drawOrder) {
      if (this.stock.length === 0) break;
      const card = this.stock.pop()!;
      this.hands[pid].push(card);
      this.lastDrawnCards.push({ playerId: pid, card: { ...card } });
    }
  }

  private isHandComplete(): boolean {
    const playersEmpty = this.players.every((p) => (this.hands[p.id] ?? []).length === 0);
    if (this.mode === TressetteMode.THREE_WITH_MORTO && this.mortoPlayerId) {
      return playersEmpty && (this.hands[this.mortoPlayerId] ?? []).length === 0;
    }
    return playersEmpty;
  }

  private finishHand(): void {
    if (this.lastTrickWinnerPlayerId) {
      if (this.mortoPlayerId && this.lastTrickWinnerPlayerId === this.mortoPlayerId) {
        const dealerTeam = this.teamIndexForSeat(this.dealerSeat);
        this.teamScores[dealerTeam] += 1;
      } else {
        const winner = this.players.find((p) => p.id === this.lastTrickWinnerPlayerId);
        if (winner) {
          const team = this.teamIndexForSeat(winner.seatIndex);
          this.teamScores[team] += 1;
        }
      }
    }
    this.teamScores[0] = Math.floor(this.teamScores[0]);
    this.teamScores[1] = Math.floor(this.teamScores[1]);
  }

  private checkGameEnd(): boolean {
    return (
      this.teamScores[0] >= this.targetScore ||
      this.teamScores[1] >= this.targetScore
    );
  }

  private autoSelectDeclarationCards(
    type: TressetteDeclarationType,
    hand: Card[],
  ): string[] {
    if (type === TressetteDeclarationType.NAPOLETANA) {
      const bySuit = new Map<Suit, Card[]>();
      for (const c of hand) {
        const arr = bySuit.get(c.suit) ?? [];
        arr.push(c);
        bySuit.set(c.suit, arr);
      }
      for (const cards of bySuit.values()) {
        const asso = cards.find((c) => c.rank === Rank.ASSO);
        const due = cards.find((c) => c.rank === Rank.DUE);
        const tre = cards.find((c) => c.rank === Rank.TRE);
        if (asso && due && tre) return [asso.id, due.id, tre.id];
      }
    } else if (type === TressetteDeclarationType.BONGIOCO) {
      for (const r of [Rank.ASSO, Rank.DUE, Rank.TRE]) {
        const matching = hand.filter((c) => c.rank === r);
        if (matching.length >= 3) return matching.slice(0, 3).map((c) => c.id);
      }
    }
    return [];
  }

  private validateDeclaration(
    playerId: string,
    decl: { type: TressetteDeclarationType; cardIds: string[] },
    hand: Card[],
  ): string | null {
    if (this.hasPlayedCardThisHand[playerId]) {
      return 'Declaration only before your first card';
    }
    const already = this.declaredThisHand[playerId] ?? new Set();
    if (already.has(decl.type)) {
      return `Already declared ${decl.type} this hand`;
    }
    if (this.trickInHand >= 3) {
      return 'Declarations only within the first three tricks';
    }
    const cards = decl.cardIds
      .map((id) => hand.find((c) => c.id === id))
      .filter(Boolean) as Card[];
    if (cards.length !== decl.cardIds.length) {
      return 'Declaration cards must be in hand';
    }
    if (decl.type === TressetteDeclarationType.NAPOLETANA) {
      if (cards.length !== 3) return 'Napoletana requires three cards';
      const suit = cards[0].suit;
      if (!cards.every((c) => c.suit === suit)) {
        return 'Napoletana must be single suit';
      }
      const ranks = new Set(cards.map((c) => c.rank));
      if (!ranks.has(Rank.ASSO) || !ranks.has(Rank.DUE) || !ranks.has(Rank.TRE)) {
        return 'Napoletana must be Asso, Due, Tre';
      }
    } else if (decl.type === TressetteDeclarationType.BONGIOCO) {
      if (cards.length !== 3) return 'Bongioco requires exactly three cards';
      const rank = cards[0].rank;
      if (![Rank.ASSO, Rank.DUE, Rank.TRE].includes(rank)) {
        return 'Bongioco must be three Assi, three Due, or three Tre';
      }
      if (!cards.every((c) => c.rank === rank)) {
        return 'Bongioco cards must all be the same rank';
      }
    } else {
      return 'Unknown declaration';
    }
    return null;
  }

  private recordDeclaration(
    playerId: string,
    decl: { type: TressetteDeclarationType; cardIds: string[] },
    hand: Card[],
  ): void {
    const cards = decl.cardIds
      .map((id) => hand.find((c) => c.id === id))
      .filter(Boolean) as Card[];
    let points = 0;
    if (decl.type === TressetteDeclarationType.NAPOLETANA) {
      points = 3;
    } else if (decl.type === TressetteDeclarationType.BONGIOCO) {
      points = 4;
    }
    const SUIT_NAMES: Record<string, string> = { bastoni: 'Bastoni', coppe: 'Coppe', denara: 'Denari', spade: 'Spade' };
    const RANK_NAMES: Record<number, string> = { 1: 'Assi', 2: 'Due', 3: 'Tre' };
    let detail: string | undefined;
    if (decl.type === TressetteDeclarationType.NAPOLETANA && cards.length > 0) {
      detail = SUIT_NAMES[cards[0].suit] ?? String(cards[0].suit);
    } else if (decl.type === TressetteDeclarationType.BONGIOCO && cards.length > 0) {
      detail = RANK_NAMES[cards[0].rank] ?? String(cards[0].rank);
    }

    const player = this.players.find((p) => p.id === playerId)!;
    const team = this.teamIndexForSeat(player.seatIndex);
    this.teamScores[team] += points;
    const entry: TressetteDeclaration = {
      playerId,
      type: decl.type,
      cards,
      points,
      detail,
    };
    this.declarations.push(entry);
  }

  private buildPlayersInfo() {
    const infos = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      seatIndex: p.seatIndex,
      cardCount: (this.hands[p.id] ?? []).length,
      team: p.team ?? 0,
      connected: p.connected ?? true,
      isAI: p.type === PlayerType.AI,
      isMorto: false,
    }));
    if (this.mode === TressetteMode.THREE_WITH_MORTO && this.mortoPlayerId && this.mortoSeatIndex !== null) {
      const dealer = this.players.find((p) => p.seatIndex === this.dealerSeat);
      infos.push({
        id: this.mortoPlayerId,
        name: 'Morto',
        seatIndex: this.mortoSeatIndex,
        cardCount: (this.hands[this.mortoPlayerId] ?? []).length,
        team: dealer?.team ?? 0,
        connected: true,
        isAI: false,
        isMorto: true,
      });
      infos.sort((a, b) => a.seatIndex - b.seatIndex);
    }
    return infos;
  }

  getSpectatorState(): unknown {
    const others = this.buildPlayersInfo();
    return {
      gameId: this.gameId,
      myHand: [],
      currentTrick: this.currentTrick,
      lastTrick: this.lastTrick,
      currentPlayerIndex: this.currentSeat,
      myIndex: -1,
      players: others,
      teamScores: this.teamScores,
      deckRemaining: this.stock.length,
      status: this.status,
      mode: this.mode,
      dealer: this.dealerSeat,
      handNumber: this.handNumber,
      targetScore: this.targetScore,
      trickWinner: this.lastTrickWinnerId(),
      declarations: [...this.declarations],
      canDeclare: false,
      spectator: true,
      drawnCards:
        this.mode === TressetteMode.TWO_PLAYERS && this.lastDrawnCards.length > 0
          ? this.lastDrawnCards.map((d) => ({ playerId: d.playerId, card: { ...d.card } }))
          : undefined,
      mortoHand:
        this.mode === TressetteMode.THREE_WITH_MORTO
          ? [...(this.hands[this.mortoPlayerId ?? ''] ?? this.mortoHand)]
          : undefined,
      mortoSeatIndex:
        this.mode === TressetteMode.THREE_WITH_MORTO
          ? this.mortoSeatIndex
          : undefined,
      isMortoTurn: this.isMortoTurn(),
    };
  }

  markPlayerConnected(playerId: string, connected: boolean): void {
    const p = this.players.find((x) => x.id === playerId);
    if (p) p.connected = connected;
  }
}
