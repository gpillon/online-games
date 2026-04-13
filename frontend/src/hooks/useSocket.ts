import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { connectSocket, setSocketAuthToken } from '@/services/socket';

let refCount = 0;

export function useSocket(enabled: boolean) {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!enabled) return;
    refCount++;
    connectSocket(token);
    return () => {
      refCount--;
    };
  }, [enabled, token]);

  useEffect(() => {
    setSocketAuthToken(token);
  }, [token]);
}
