import {
  Card,
  Rank,
  Suit,
  TRESSETTE_CARD_ORDER,
  TRESSETTE_CARD_POINTS,
  TressetteClientState,
  TressetteDeclarationType,
} from '@online-games/shared';
import { IAIPlayer } from '../../interfaces/ai-player.interface';

function rankStrength(rank: Rank): number {
  const i = TRESSETTE_CARD_ORDER.indexOf(rank);
  return i === -1 ? 999 : i;
}

function cardPoints(card: Card): number {
  return TRESSETTE_CARD_POINTS[card.rank] ?? 0;
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
  const suits: Suit[] = [
    Suit.BASTONI,
    Suit.COPPE,
    Suit.DENARA,
    Suit.SPADE,
  ];
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
  const valuable = hand.filter((c) => cardPoints(c) > 0);
  if (valuable.length >= 3) {
    return valuable.slice(0, Math.min(5, valuable.length));
  }
  return null;
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
    const contender = state.currentTrick.length
      ? bestContenderInTrick(state.currentTrick, led!)
      : null;

    const winning = this.isLikelyWinning(state, playerId);

    let pick: Card;
    if (!state.currentTrick.length) {
      pick = this.chooseLead(options, winning);
    } else if (!contender) {
      pick = this.pickLowest(options);
    } else {
      const canWin = options.filter(
        (c) =>
          c.suit === led &&
          rankStrength(c.rank) < contender.strength,
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

    const move: {
      type: 'play';
      cardId: string;
      declaration?: { type: TressetteDeclarationType; cardIds: string[] };
    } = { type: 'play', cardId: pick.id };

    if (state.canDeclare) {
      const napo = napoletanaIfAny(hand);
      if (napo && napo.some((c) => c.id === pick.id)) {
        move.declaration = {
          type: TressetteDeclarationType.NAPOLETANA,
          cardIds: napo.map((c) => c.id),
        };
      } else {
        const bong = bongiocoIfAny(hand);
        if (bong && Math.random() > 0.45) {
          move.declaration = {
            type: TressetteDeclarationType.BONGIOCO,
            cardIds: bong.map((c) => c.id),
          };
        }
      }
    }

    void playerId;
    return move;
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

  private pickLowest(options: Card[]): Card {
    return options.reduce((a, b) =>
      rankStrength(a.rank) > rankStrength(b.rank) ? a : b,
    );
  }
}
