import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token?: string | null): Socket {
  if (socket?.connected) {
    return socket;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = io({
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    auth: token ? { token } : {},
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function setSocketAuthToken(token: string | null): void {
  if (socket) {
    socket.auth = token ? { token } : {};
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }
}
