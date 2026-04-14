import {
  Card,
  Rank,
  Suit,
  TRESSETTE_CARD_ORDER,
  TressetteClientState,
  TressetteDeclarationType,
} from '@online-games/shared';
import { IAIPlayer } from '../../interfaces/ai-player.interface';

const VALUABLE_RANKS = new Set([Rank.ASSO, Rank.DUE, Rank.TRE]);
const SUIT_NAMES: Record<string, string> = {
  bastoni: 'bastoni',
  coppe: 'coppe',
  denara: 'denari',
  spade: 'spade',
};
const RANK_NAMES: Record<number, string> = {
  1: "l'asso",
  2: 'il due',
  3: 'il tre',
};

function rankStrength(rank: Rank): number {
  const i = TRESSETTE_CARD_ORDER.indexOf(rank);
  return i === -1 ? 999 : i;
}

function bestContenderInTrick(
  trick: { card: Card }[],
  ledSuit: Suit,
): { card: Card; strength: number } | null {
  const led = trick.filter((t) => t.card.suit === ledSuit);
  if (!led.length) return null;
  let best = led[0].card;
  let bestStr = rankStrength(best.rank);
  for (const t of led.slice(1)) {
    const s = rankStrength(t.card.rank);
    if (s < bestStr) {
      best = t.card;
      bestStr = s;
    }
  }
  return { card: best, strength: bestStr };
}

function legalCards(hand: Card[], ledSuit?: Suit): Card[] {
  if (!ledSuit) return [...hand];
  const follow = hand.filter((c) => c.suit === ledSuit);
  return follow.length ? follow : [...hand];
}

function napoletanaIfAny(hand: Card[]): Card[] | null {
  const suits: Suit[] = [Suit.BASTONI, Suit.COPPE, Suit.DENARA, Suit.SPADE];
  for (const suit of suits) {
    const has = (r: Rank) => hand.some((c) => c.suit === suit && c.rank === r);
    if (has(Rank.ASSO) && has(Rank.DUE) && has(Rank.TRE)) {
      return hand.filter(
        (c) =>
          c.suit === suit &&
          (c.rank === Rank.ASSO || c.rank === Rank.DUE || c.rank === Rank.TRE),
      );
    }
  }
  return null;
}

function bongiocoIfAny(hand: Card[]): Card[] | null {
  for (const r of [Rank.ASSO, Rank.DUE, Rank.TRE]) {
    const matching = hand.filter((c) => c.rank === r);
    if (matching.length >= 3) return matching.slice(0, 3);
  }
  return null;
}

export interface AIMoveResult {
  type: 'play';
  cardId: string;
  declaration?: { type: TressetteDeclarationType; cardIds: string[] };
  chat?: string;
}

export class TressetteAI implements IAIPlayer {
  getDifficulty(): string {
    return 'intermediate';
  }

  chooseMove(gameState: unknown, playerId: string): unknown {
    const state = gameState as TressetteClientState;
    const hand = [...state.myHand];
    const led = state.currentTrick[0]?.card.suit;
    const options = legalCards(hand, led);
    const followingSuit = !!led && options[0]?.suit === led;
    const contender = state.currentTrick.length
      ? bestContenderInTrick(state.currentTrick, led!)
      : null;

    const winning = this.isLikelyWinning(state, playerId);

    let pick: Card;
    if (!state.currentTrick.length) {
      pick = this.chooseLead(options, winning);
    } else if (!followingSuit) {
      pick = this.pickDiscard(options);
    } else if (!contender) {
      pick = this.pickLowest(options);
    } else {
      const canWin = options.filter(
        (c) =>
          c.suit === led && rankStrength(c.rank) < contender.strength,
      );
      if (canWin.length) {
        pick = winning
          ? canWin.reduce((a, b) =>
              rankStrength(a.rank) > rankStrength(b.rank) ? a : b,
            )
          : canWin.reduce((a, b) =>
              rankStrength(a.rank) < rankStrength(b.rank) ? a : b,
            );
      } else {
        pick = this.pickLowest(options);
      }
    }

    const move: AIMoveResult & { declarations?: { type: TressetteDeclarationType; cardIds: string[] }[] } = {
      type: 'play',
      cardId: pick.id,
    };

    const avail = (
      state as unknown as { availableDeclarations?: TressetteDeclarationType[] }
    ).availableDeclarations;
    if (state.canDeclare && avail && avail.length > 0) {
      const decls: { type: TressetteDeclarationType; cardIds: string[] }[] = [];
      if (avail.includes(TressetteDeclarationType.NAPOLETANA)) {
        const napo = napoletanaIfAny(hand);
        if (napo) {
          decls.push({
            type: TressetteDeclarationType.NAPOLETANA,
            cardIds: napo.map((c) => c.id),
          });
        }
      }
      if (avail.includes(TressetteDeclarationType.BONGIOCO)) {
        const bong = bongiocoIfAny(hand);
        if (bong) {
          decls.push({
            type: TressetteDeclarationType.BONGIOCO,
            cardIds: bong.map((c) => c.id),
          });
        }
      }
      if (decls.length > 0) {
        move.declarations = decls;
      }
    }

    if (!state.currentTrick.length) {
      move.chat = this.buildLeadChat(pick, hand);
    }

    void playerId;
    return move;
  }

  private buildLeadChat(pick: Card, hand: Card[]): string | undefined {
    if (hand.length === 1) return 'Volo!';

    const suitCards = hand.filter((c) => c.suit === pick.suit);
    if (suitCards.length === 1) return 'Volo!';

    if (VALUABLE_RANKS.has(pick.rank)) {
      const name = RANK_NAMES[pick.rank];
      const suitName = SUIT_NAMES[pick.suit] ?? pick.suit;
      const others = suitCards.filter((c) => c.id !== pick.id);
      const otherValuable = others.filter((c) => VALUABLE_RANKS.has(c.rank));
      if (otherValuable.length >= 1) {
        const otherName = otherValuable.map((c) => RANK_NAMES[c.rank] ?? String(c.rank)).join(' e ');
        return `Ho ${name} di ${suitName}, e ${otherName}`;
      }
      return `Ho ${name} di ${suitName}`;
    }

    const valuableInSuit = suitCards.filter((c) => VALUABLE_RANKS.has(c.rank));
    if (valuableInSuit.length > 0) {
      const suitName = SUIT_NAMES[pick.suit] ?? pick.suit;
      return `Voglio ${suitName}`;
    }

    return 'Messo male...';
  }

  private isLikelyWinning(
    state: TressetteClientState,
    playerId: string,
  ): boolean {
    const me = state.players.find((p) => p.id === playerId);
    if (!me) return false;
    const team = me.team;
    const ours = state.teamScores[team];
    const theirs = state.teamScores[team === 0 ? 1 : 0];
    return ours >= theirs;
  }

  private chooseLead(options: Card[], winning: boolean): Card {
    if (winning) {
      return options.reduce((a, b) =>
        rankStrength(a.rank) < rankStrength(b.rank) ? a : b,
      );
    }
    const suitCounts = new Map<Suit, number>();
    for (const c of options) {
      suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
    }
    let longestSuit = Suit.BASTONI;
    let max = 0;
    for (const [s, n] of suitCounts) {
      if (n > max) {
        max = n;
        longestSuit = s;
      }
    }
    const fromLong = options.filter((c) => c.suit === longestSuit);
    const pool = fromLong.length ? fromLong : options;
    return pool.reduce((a, b) =>
      rankStrength(a.rank) > rankStrength(b.rank) ? a : b,
    );
  }

  /** When discarding off-suit: save valuable cards (Asso/Due/Tre), sacrifice scartine first. */
  private pickDiscard(options: Card[]): Card {
    const scartine = options.filter((c) => !VALUABLE_RANKS.has(c.rank));
    if (scartine.length > 0) {
      return scartine.reduce((a, b) =>
        rankStrength(a.rank) > rankStrength(b.rank) ? a : b,
      );
    }
    return options.reduce((a, b) =>
      rankStrength(a.rank) > rankStrength(b.rank) ? a : b,
    );
  }

  private pickLowest(options: Card[]): Card {
    return options.reduce((a, b) =>
      rankStrength(a.rank) > rankStrength(b.rank) ? a : b,
    );
  }
}
