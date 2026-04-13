/**
 * Mirrors @online-games/shared websocket events (ESM-friendly).
 * Keep in sync with shared/src/websocket.events.ts
 */
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  LOBBY_ROOMS_UPDATE: 'lobby:rooms_update',
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_UPDATE: 'room:update',
  ROOM_PLAYER_JOINED: 'room:player_joined',
  ROOM_PLAYER_LEFT: 'room:player_left',
  ROOM_CHAT: 'room:chat',
  ROOM_CHAT_MESSAGE: 'room:chat_message',
  ROOM_ADD_AI: 'room:add_ai',
  ROOM_START_GAME: 'room:start_game',
  GAME_STATE: 'game:state',
  GAME_MOVE: 'game:move',
  GAME_MOVE_RESULT: 'game:move_result',
  GAME_TRICK_COMPLETE: 'game:trick_complete',
  GAME_HAND_COMPLETE: 'game:hand_complete',
  GAME_OVER: 'game:over',
  GAME_ERROR: 'game:error',
  GAME_DECLARATION: 'game:declaration',
  GAME_PLAYER_RECONNECTED: 'game:player_reconnected',
  GAME_REQUEST_STATE: 'game:request_state',
  ERROR: 'error',
} as const;
