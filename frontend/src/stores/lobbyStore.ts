import type { ChatMessage, CreateRoomRequest, GameRoom, JoinRoomRequest, RoomListItem } from '@online-games/shared';
import { WS_EVENTS } from '@/lib/wsEvents';
import { create } from 'zustand';
import { apiFetch } from '@/services/api';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';

interface LobbyState {
  rooms: RoomListItem[];
  currentRoom: GameRoom | null;
  chatMessages: ChatMessage[];
  loading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  subscribeLobby: () => void;
  unsubscribeLobby: () => void;
  createRoom: (req: CreateRoomRequest) => Promise<GameRoom>;
  joinRoom: (req: JoinRoomRequest) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  addAi: (roomId: string, seatIndex?: number) => void;
  kickPlayer: (roomId: string, targetId: string) => void;
  removeAi: (roomId: string, targetId: string) => void;
  reorderPlayers: (roomId: string, orderedIds: string[]) => void;
  startGame: (roomId: string) => void;
  sendChat: (roomId: string, message: string) => void;
  spectateRoom: (roomId: string) => void;
  setCurrentRoom: (room: GameRoom | null) => void;
  appendChat: (msg: ChatMessage) => void;
  patchCurrentRoom: (room: GameRoom | { id: string; closed: true }) => void;
  reset: () => void;
}

let roomsHandler: ((list: RoomListItem[]) => void) | null = null;

export const useLobbyStore = create<LobbyState>((set, get) => ({
  rooms: [],
  currentRoom: null,
  chatMessages: [],
  loading: false,
  error: null,

  reset: () =>
    set({
      currentRoom: null,
      chatMessages: [],
      error: null,
    }),

  setCurrentRoom: (room) => set({ currentRoom: room, chatMessages: [] }),

  appendChat: (msg) => {
    if (get().currentRoom?.id !== msg.roomId) return;
    set((state) => ({ chatMessages: [...state.chatMessages, msg] }));
  },

  patchCurrentRoom: (room) => {
    if ('closed' in room && room.closed) {
      if (get().currentRoom?.id === room.id) {
        set({ currentRoom: null, chatMessages: [] });
      }
      return;
    }
    if (get().currentRoom?.id === room.id) {
      set({ currentRoom: room as GameRoom });
    }
  },

  fetchRooms: async () => {
    set({ loading: true, error: null });
    try {
      const list = await apiFetch<RoomListItem[]>('/lobby/rooms');
      set({ rooms: list, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Impossibile caricare le stanze',
      });
    }
  },

  subscribeLobby: () => {
    const s = getSocket();
    if (!s) return;
    roomsHandler = (list: RoomListItem[]) => set({ rooms: list });
    s.emit(WS_EVENTS.LOBBY_JOIN);
    s.on(WS_EVENTS.LOBBY_ROOMS_UPDATE, roomsHandler);
  },

  unsubscribeLobby: () => {
    const s = getSocket();
    if (s && roomsHandler) {
      s.emit(WS_EVENTS.LOBBY_LEAVE);
      s.off(WS_EVENTS.LOBBY_ROOMS_UPDATE, roomsHandler);
    }
    roomsHandler = null;
  },

  createRoom: async (req) => {
    const token = useAuthStore.getState().token;
    const room = await apiFetch<GameRoom>('/lobby/rooms', {
      method: 'POST',
      body: req,
      token,
    });
    set({ currentRoom: room, chatMessages: [] });
    return room;
  },

  joinRoom: async (req) => {
    const s = getSocket();
    if (!s) {
      throw new Error('Socket non connesso');
    }
    return new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Timeout')), 15000);
      const onErr = (payload: { message?: string }) => {
        window.clearTimeout(timeout);
        s.off(WS_EVENTS.ERROR, onErr);
        s.off(WS_EVENTS.ROOM_UPDATE, onOk);
        reject(new Error(payload.message ?? 'Impossibile entrare'));
      };
      const onOk = (room: GameRoom) => {
        if (room.id !== req.roomId) return;
        window.clearTimeout(timeout);
        s.off(WS_EVENTS.ERROR, onErr);
        s.off(WS_EVENTS.ROOM_UPDATE, onOk);
        set({ currentRoom: room, chatMessages: [] });
        resolve();
      };
      s.once(WS_EVENTS.ERROR, onErr);
      s.once(WS_EVENTS.ROOM_UPDATE, onOk);
      s.emit(WS_EVENTS.ROOM_JOIN, req);
    });
  },

  leaveRoom: async (roomId) => {
    const s = getSocket();
    if (s) {
      s.emit(WS_EVENTS.ROOM_LEAVE, { roomId });
    }
    if (get().currentRoom?.id === roomId) {
      set({ currentRoom: null, chatMessages: [] });
    }
  },

  addAi: (roomId, seatIndex) => {
    getSocket()?.emit(WS_EVENTS.ROOM_ADD_AI, { roomId, seatIndex });
  },

  kickPlayer: (roomId, targetId) => {
    getSocket()?.emit(WS_EVENTS.ROOM_KICK, { roomId, targetId });
  },

  removeAi: (roomId, targetId) => {
    getSocket()?.emit(WS_EVENTS.ROOM_REMOVE_AI, { roomId, targetId });
  },

  reorderPlayers: (roomId, orderedIds) => {
    getSocket()?.emit(WS_EVENTS.ROOM_REORDER, { roomId, orderedIds });
  },

  startGame: (roomId) => {
    getSocket()?.emit(WS_EVENTS.ROOM_START_GAME, { roomId });
  },

  sendChat: (roomId, message) => {
    getSocket()?.emit(WS_EVENTS.ROOM_CHAT, { roomId, message });
  },

  spectateRoom: (roomId) => {
    const s = getSocket();
    if (!s) return;
    s.emit(WS_EVENTS.ROOM_SPECTATE, { roomId });
  },
}));
