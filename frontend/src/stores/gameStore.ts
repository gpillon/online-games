import type { TressetteClientState, TressetteDeclarationType } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { WS_EVENTS } from '@/lib/wsEvents';
import { create } from 'zustand';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';

interface GameState {
  gameId: string | null;
  gameType: OG.GameType | null;
  clientState: TressetteClientState | null;
  error: string | null;
  validCardIds: string[] | null;
  lastTrickModalOpen: boolean;
  pendingDeclaration: { type: TressetteDeclarationType; cardIds: string[] } | null;
  setLastTrickModalOpen: (open: boolean) => void;
  bindGameEvents: (gameId: string, gameType?: OG.GameType) => () => void;
  playCard: (cardId: string) => void;
  sendDeclaration: (type: TressetteDeclarationType, cardIds: string[]) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  gameId: null,
  gameType: null,
  clientState: null,
  error: null,
  validCardIds: null,
  lastTrickModalOpen: false,
  pendingDeclaration: null,

  setLastTrickModalOpen: (open) => set({ lastTrickModalOpen: open }),

  clearGame: () =>
    set({
      gameId: null,
      gameType: null,
      clientState: null,
      error: null,
      validCardIds: null,
      lastTrickModalOpen: false,
      pendingDeclaration: null,
    }),

  playCard: (cardId) => {
    const { gameId, pendingDeclaration } = get();
    const token = useAuthStore.getState().token;
    if (!gameId) return;
    const payload: Record<string, unknown> = {
      gameId,
      token,
      type: 'play_card',
      data: { cardId },
    };
    if (pendingDeclaration) {
      payload.declaration = pendingDeclaration;
      set({ pendingDeclaration: null });
    }
    getSocket()?.emit(WS_EVENTS.GAME_MOVE, payload);
  },

  sendDeclaration: (type, cardIds) => {
    set({ pendingDeclaration: { type, cardIds } });
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

    const onError = (payload: { message?: string }) => {
      set({ error: payload.message ?? 'Errore di gioco' });
    };

    s.on(WS_EVENTS.GAME_STATE, onState);
    s.on(WS_EVENTS.GAME_ERROR, onError);

    set({ gameId, gameType });

    if (!get().clientState) {
      s.emit(WS_EVENTS.GAME_REQUEST_STATE, { gameId });
    }

    return () => {
      s.off(WS_EVENTS.GAME_STATE, onState);
      s.off(WS_EVENTS.GAME_ERROR, onError);
    };
  },
}));
