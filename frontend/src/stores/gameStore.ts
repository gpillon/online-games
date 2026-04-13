import type { TressetteClientState } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { WS_EVENTS } from '@/lib/wsEvents';
import { create } from 'zustand';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';

export type TablePhase = 'idle' | 'play' | 'trick_collect';

interface GameState {
  gameId: string | null;
  gameType: OG.GameType | null;
  clientState: TressetteClientState | null;
  error: string | null;
  /** Optional hints from server for playable cards */
  validCardIds: string[] | null;
  tablePhase: TablePhase;
  lastTrickModalOpen: boolean;
  trickCollectKey: number;
  setLastTrickModalOpen: (open: boolean) => void;
  setTablePhase: (phase: TablePhase) => void;
  bumpTrickCollect: () => void;
  bindGameEvents: (gameId: string, gameType?: OG.GameType) => () => void;
  playCard: (cardId: string) => void;
  sendDeclaration: (type: string, cardIds: string[]) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  gameId: null,
  gameType: null,
  clientState: null,
  error: null,
  validCardIds: null,
  tablePhase: 'idle',
  lastTrickModalOpen: false,
  trickCollectKey: 0,

  setLastTrickModalOpen: (open) => set({ lastTrickModalOpen: open }),

  setTablePhase: (phase) => set({ tablePhase: phase }),

  bumpTrickCollect: () => set((s) => ({ trickCollectKey: s.trickCollectKey + 1 })),

  clearGame: () =>
    set({
      gameId: null,
      gameType: null,
      clientState: null,
      error: null,
      validCardIds: null,
      tablePhase: 'idle',
      lastTrickModalOpen: false,
    }),

  playCard: (cardId) => {
    const { gameId } = get();
    const token = useAuthStore.getState().token;
    if (!gameId) return;
    getSocket()?.emit(WS_EVENTS.GAME_MOVE, {
      gameId,
      token,
      type: 'play_card',
      data: { cardId },
    });
  },

  sendDeclaration: (type, cardIds) => {
    const { gameId } = get();
    const token = useAuthStore.getState().token;
    if (!gameId) return;
    getSocket()?.emit(WS_EVENTS.GAME_DECLARATION, {
      gameId,
      token,
      type,
      data: { cardIds },
    });
  },

  bindGameEvents: (gameId: string, gameType: OG.GameType = OG.GameType.TRESSETTE) => {
    const s = getSocket();
    if (!s) {
      return () => {};
    }

    const onState = (payload: TressetteClientState & { validCardIds?: string[] }) => {
      const { validCardIds, ...rest } = payload;
      set({
        gameId: rest.gameId,
        gameType,
        clientState: rest,
        validCardIds: validCardIds ?? null,
        error: null,
      });
    };

    const onTrickComplete = (_payload: unknown) => {
      set({ tablePhase: 'trick_collect' });
      get().bumpTrickCollect();
      window.setTimeout(() => {
        set({ tablePhase: 'play' });
      }, 900);
    };

    const onError = (payload: { message?: string }) => {
      set({ error: payload.message ?? 'Errore di gioco' });
    };

    const onOver = () => {
      set({ tablePhase: 'idle' });
    };

    s.on(WS_EVENTS.GAME_STATE, onState);
    s.on(WS_EVENTS.GAME_TRICK_COMPLETE, onTrickComplete);
    s.on(WS_EVENTS.GAME_ERROR, onError);
    s.on(WS_EVENTS.GAME_OVER, onOver);

    set({ gameId, gameType });

    return () => {
      s.off(WS_EVENTS.GAME_STATE, onState);
      s.off(WS_EVENTS.GAME_TRICK_COMPLETE, onTrickComplete);
      s.off(WS_EVENTS.GAME_ERROR, onError);
      s.off(WS_EVENTS.GAME_OVER, onOver);
    };
  },
}));
