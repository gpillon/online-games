import { AnimatePresence, motion } from 'framer-motion';
import { Smile } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { WS_EVENTS } from '@/lib/wsEvents';
import { apiFetch } from '@/services/api';
import { getSocket } from '@/services/socket';

interface Emote {
  id: string;
  name: string;
  imageUrl: string;
}

interface EmoteBubble {
  id: string;
  userId: string;
  username: string;
  emoteId: string;
  imageUrl: string;
  timestamp: number;
}

export interface EmotePanelProps {
  roomId: string;
  className?: string;
}

export function EmotePanel({ roomId, className = '' }: EmotePanelProps) {
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState<EmoteBubble[]>([]);

  useEffect(() => {
    void apiFetch<Emote[]>('/emotes').then(setEmotes).catch(() => {});
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const handler = (data: { userId: string; username: string; emoteId: string }) => {
      const emote = emotes.find((e) => e.id === data.emoteId);
      if (!emote) return;
      const bubble: EmoteBubble = {
        id: `${Date.now()}-${data.userId}`,
        userId: data.userId,
        username: data.username,
        emoteId: data.emoteId,
        imageUrl: emote.imageUrl,
        timestamp: Date.now(),
      };
      setBubbles((prev) => [...prev.slice(-4), bubble]);
      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
      }, 3000);
    };
    s.on(WS_EVENTS.GAME_EMOTE, handler);
    return () => {
      s.off(WS_EVENTS.GAME_EMOTE, handler);
    };
  }, [emotes]);

  const sendEmote = useCallback(
    (emoteId: string) => {
      getSocket()?.emit(WS_EVENTS.GAME_EMOTE, { roomId, emoteId });
      setOpen(false);
    },
    [roomId],
  );

  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2">
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.div
              key={b.id}
              className="mb-2 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
            >
              <img src={`${apiBase}${b.imageUrl}`} alt="" className="h-8 w-8" />
              <span className="font-display text-xs text-gold">{b.username}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-black/40 text-gold/70 transition-colors hover:bg-gold/20 hover:text-gold"
      >
        <Smile className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-12 z-50 max-h-48 w-56 overflow-y-auto rounded-xl border border-gold/30 bg-black/90 p-2 shadow-xl backdrop-blur-sm"
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
          >
            {emotes.length === 0 ? (
              <p className="p-2 text-center font-body text-xs text-gold/50">Nessuna emote disponibile</p>
            ) : (
              <div className="grid grid-cols-4 gap-1">
                {emotes.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="flex flex-col items-center gap-0.5 rounded-lg p-1.5 transition-colors hover:bg-gold/10"
                    onClick={() => sendEmote(e.id)}
                    title={e.name}
                  >
                    <img src={`${apiBase}${e.imageUrl}`} alt={e.name} className="h-8 w-8" />
                    <span className="truncate text-[9px] text-gold/50">{e.name}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
