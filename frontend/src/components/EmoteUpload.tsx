import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface Emote {
  id: string;
  name: string;
  imageUrl: string;
  uploadedBy: string;
}

export function EmoteUpload() {
  const token = useAuthStore((s) => s.token);
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

  useEffect(() => {
    void apiFetch<Emote[]>('/emotes').then(setEmotes).catch(() => {});
  }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !name.trim() || !token) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('file', file);
      const res = await fetch(`${apiBase}/api/emotes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const emote = await res.json();
        setEmotes((prev) => [emote, ...prev]);
        setName('');
        if (fileRef.current) fileRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {emotes.map((e) => (
          <div key={e.id} className="flex flex-col items-center gap-1 rounded-lg border border-gold/10 p-2">
            <img src={`${apiBase}${e.imageUrl}`} alt={e.name} className="h-10 w-10" />
            <span className="text-xs text-gold/60">{e.name}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block font-display text-xs text-gold/70">Nome emote</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            className="rounded-lg border border-gold/20 bg-black/40 px-3 py-1.5 font-body text-sm text-ivory focus:border-gold/50 focus:outline-none"
            placeholder="es. risata"
          />
        </div>
        <div>
          <label className="mb-1 block font-display text-xs text-gold/70">Immagine</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="text-xs text-gold/60 file:mr-2 file:rounded-lg file:border-0 file:bg-gold/20 file:px-3 file:py-1.5 file:text-xs file:text-gold"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          onClick={() => void handleUpload()}
          disabled={uploading || !name.trim()}
        >
          <Upload className="mr-1 h-3 w-3" />
          {uploading ? 'Caricamento...' : 'Carica'}
        </Button>
      </div>
    </div>
  );
}
