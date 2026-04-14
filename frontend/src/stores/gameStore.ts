import type { TressetteClientState, TressetteDeclarationType } from '@online-games/shared';
import * as OG from '@online-games/shared';
import { WS_EVENTS } from '@/lib/wsEvents';
import { create } from 'zustand';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';

type DeclPayload = { type: TressetteDeclarationType; cardIds: string[] };

interface GameState {
  gameId: string | null;
  gameType: OG.GameType | null;
  clientState: TressetteClientState | null;
  error: string | null;
  validCardIds: string[] | null;
  lastTrickModalOpen: boolean;
  pendingDeclarations: DeclPayload[];
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
  pendingDeclarations: [],

  setLastTrickModalOpen: (open) => set({ lastTrickModalOpen: open }),

  clearGame: () =>
    set({
      gameId: null,
      gameType: null,
      clientState: null,
      error: null,
      validCardIds: null,
      lastTrickModalOpen: false,
      pendingDeclarations: [],
    }),

  playCard: (cardId) => {
    const { gameId, pendingDeclarations } = get();
    const token = useAuthStore.getState().token;
    if (!gameId) return;
    const payload: Record<string, unknown> = {
      gameId,
      token,
      type: 'play_card',
      data: { cardId },
    };
    if (pendingDeclarations.length === 1) {
      payload.declaration = pendingDeclarations[0];
    } else if (pendingDeclarations.length > 1) {
      payload.declarations = pendingDeclarations;
    }
    set({ pendingDeclarations: [] });
    getSocket()?.emit(WS_EVENTS.GAME_MOVE, payload);
  },

  sendDeclaration: (type, cardIds) => {
    set((s) => ({
      pendingDeclarations: [...s.pendingDeclarations, { type, cardIds }],
    }));
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
