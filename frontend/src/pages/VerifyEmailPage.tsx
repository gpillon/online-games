import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import { apiFetch } from '@/services/api';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('err');
      setMsg("Token mancante nell'URL.");
      return;
    }
    void apiFetch<{ message?: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus('ok');
        setMsg('Email verificata con successo. Puoi accedere.');
      })
      .catch(() => {
        setStatus('err');
        setMsg('Verifica non riuscita. Il link potrebbe essere scaduto.');
      });
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center px-4 py-16">
      <GlassPanel className="w-full p-10 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <h1 className="mb-4 font-display text-3xl text-gradient-gold">Verifica email</h1>
          <p className="font-body text-lg text-gold/80">{status === 'idle' ? 'Verifica in corso…' : msg}</p>
          <Link to="/login" className="mt-8 inline-block">
            <Button type="button" variant="primary">
              Vai al login
            </Button>
          </Link>
        </motion.div>
      </GlassPanel>
    </div>
  );
}
