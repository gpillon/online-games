import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { connectSocket, disconnectSocket, setSocketAuthToken } from '@/services/socket';

export function useSocket(enabled: boolean) {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!enabled) return;
    connectSocket(token);
    return () => {
      disconnectSocket();
    };
  }, [enabled, token]);

  useEffect(() => {
    setSocketAuthToken(token);
  }, [token]);
}
