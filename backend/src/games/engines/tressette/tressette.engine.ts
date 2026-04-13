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

type TressettePlayMove = {
  type: 'play';
  cardId: string;
  declaration?: {
    type: TressetteDeclarationType;
    cardIds: string[];
  };
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
  private declarations: TressetteDeclaration[] = [];
  private dealerSeat = 0;
  private currentSeat = 0;
  private handNumber = 0;
  private trickInHand = 0;
  private hasPlayedCardThisHand: Record<string, boolean> = {};
  private declaredPlayers: Set<string> = new Set();
  private lastTrickWinnerPlayerId: string | null = null;
  private createdAt = new Date().toISOString();

  constructor(gameId: string, options: TressetteEngineOptions) {
    this.gameId = gameId;
    this.mode = options.mode;
    this.targetScore = options.targetScore ?? 21;
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
    return this.playerAtSeat(this.currentSeat).id;
  }

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
    const others = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      seatIndex: p.seatIndex,
      cardCount: (this.hands[p.id] ?? []).length,
      team: p.team ?? 0,
      connected: p.connected ?? true,
      isAI: p.type === PlayerType.AI,
      isMorto: false,
    }));
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
        !this.declaredPlayers.has(playerId) &&
        this.trickInHand === 0,
    };
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

    const hand = this.hands[playerId];
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

    if (m.declaration) {
      const declErr = this.validateDeclaration(playerId, m.declaration, hand);
      if (declErr) return { success: false, error: declErr };
    }

    if (dryRun) {
      return { success: true };
    }

    if (m.declaration) {
      this.recordDeclaration(playerId, m.declaration, hand);
      this.declaredPlayers.add(playerId);
    }

    hand.splice(cardIndex, 1);
    const player = this.players.find((p) => p.id === playerId)!;
    this.currentTrick.push({
      card,
      playerId,
      playerName: player.name,
      seatIndex: player.seatIndex,
    });
    this.hasPlayedCardThisHand[playerId] = true;

    const expected = this.players.length;
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
        this.dealerSeat = (this.dealerSeat + 1) % this.players.length;
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
    for (const p of this.players) {
      if (this.mode === TressetteMode.FOUR_PLAYERS) {
        p.team = p.seatIndex % 2 === 0 ? 0 : 1;
      } else if (this.mode === TressetteMode.THREE_WITH_MORTO) {
        p.team = p.seatIndex === 0 ? 0 : 1;
      } else {
        p.team = p.seatIndex;
      }
    }
  }

  private teamIndexForSeat(seat: number): 0 | 1 {
    const p = this.playerAtSeat(seat);
    return (p.team ?? 0) as 0 | 1;
  }

  private playerAtSeat(seat: number): GamePlayer {
    const p = this.players.find((x) => x.seatIndex === seat);
    if (!p) throw new Error('Invalid seat');
    return p;
  }

  private dealHand(): void {
    this.currentTrick = [];
    this.trickInHand = 0;
    this.hasPlayedCardThisHand = {};
    this.declaredPlayers.clear();
    for (const p of this.players) {
      this.tricksWon[p.id] = this.tricksWon[p.id] ?? [];
    }

    let deck = shuffleDeck(createDeck());
    this.stock = [];
    this.mortoCard = null;

    if (this.mode === TressetteMode.TWO_PLAYERS) {
      for (const p of this.players) {
        this.hands[p.id] = deck.splice(0, 10);
      }
      this.stock = deck;
    } else if (this.mode === TressetteMode.THREE_WITH_MORTO) {
      for (const p of this.players) {
        this.hands[p.id] = deck.splice(0, 13);
      }
      this.mortoCard = deck.pop() ?? null;
    } else {
      for (const p of this.players) {
        this.hands[p.id] = deck.splice(0, 10);
      }
    }

    this.currentSeat = (this.dealerSeat + 1) % this.players.length;
  }

  private advanceTurn(): void {
    this.currentSeat = (this.currentSeat + 1) % this.players.length;
  }

  private resolveTrickWinner(): GamePlayer {
    return this.resolveTrickWinnerFrom(this.currentTrick);
  }

  private resolveTrickWinnerFrom(trick: TrickCard[]): GamePlayer {
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
    return this.players.find((p) => p.id === best.playerId)!;
  }

  private awardTrick(winnerId: string, cards: Card[]): void {
    this.tricksWon[winnerId].push(cards);
    const winner = this.players.find((p) => p.id === winnerId)!;
    const pts = trickPoints(cards);
    const team = this.teamIndexForSeat(winner.seatIndex);
    this.teamScores[team] += pts;
  }

  private drawFromStock(winnerId: string): void {
    if (this.stock.length === 0) return;
    const loser = this.players.find((p) => p.id !== winnerId)!;
    const drawOrder = [winnerId, loser.id];
    for (const pid of drawOrder) {
      if (this.stock.length === 0) break;
      const card = this.stock.pop()!;
      this.hands[pid].push(card);
    }
  }

  private isHandComplete(): boolean {
    return this.players.every((p) => (this.hands[p.id] ?? []).length === 0);
  }

  private finishHand(): void {
    if (
      this.mode === TressetteMode.THREE_WITH_MORTO &&
      this.mortoCard &&
      this.lastTrickWinnerPlayerId
    ) {
      const lastWinnerId = this.lastTrickWinnerPlayerId;
      this.tricksWon[lastWinnerId].push([this.mortoCard]);
      const winner = this.players.find((p) => p.id === lastWinnerId)!;
      const team = this.teamIndexForSeat(winner.seatIndex);
      this.teamScores[team] += cardPoints(this.mortoCard);
      this.mortoCard = null;
    }
  }

  private checkGameEnd(): boolean {
    return (
      this.teamScores[0] >= this.targetScore ||
      this.teamScores[1] >= this.targetScore
    );
  }

  private validateDeclaration(
    playerId: string,
    decl: { type: TressetteDeclarationType; cardIds: string[] },
    hand: Card[],
  ): string | null {
    if (this.hasPlayedCardThisHand[playerId]) {
      return 'Declaration only before your first card';
    }
    if (this.declaredPlayers.has(playerId)) {
      return 'Already declared this hand';
    }
    if (this.trickInHand !== 0) {
      return 'Declarations only on the first trick of the hand';
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
      if (cards.length < 3) return 'Bongioco requires at least three cards';
      const allValuable = cards.every((c) => cardPoints(c) > 0);
      if (!allValuable) {
        return 'Bongioco cards must carry points';
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
    } else {
      points = 3 + Math.max(0, cards.length - 3);
    }
    const player = this.players.find((p) => p.id === playerId)!;
    const team = this.teamIndexForSeat(player.seatIndex);
    this.teamScores[team] += points;
    const entry: TressetteDeclaration = {
      playerId,
      type: decl.type,
      cards,
      points,
    };
    this.declarations.push(entry);
  }

  getSpectatorState(): unknown {
    const others = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      seatIndex: p.seatIndex,
      cardCount: (this.hands[p.id] ?? []).length,
      team: p.team ?? 0,
      connected: p.connected ?? true,
      isAI: p.type === PlayerType.AI,
      isMorto: false,
    }));
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
    };
  }

  markPlayerConnected(playerId: string, connected: boolean): void {
    const p = this.players.find((x) => x.id === playerId);
    if (p) p.connected = connected;
  }
}
