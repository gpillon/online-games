import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (window.grecaptcha?.execute) {
    return Promise.resolve();
  }
  const existing = document.querySelector<HTMLScriptElement>(
    'script[src*="google.com/recaptcha/api.js"]',
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.grecaptcha?.execute) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('reCAPTCHA load failed')), {
        once: true,
      });
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('reCAPTCHA load failed'));
    document.head.appendChild(s);
  });
}

async function getRecaptchaToken(siteKey: string): Promise<string> {
  await loadRecaptchaScript(siteKey);
  const g = window.grecaptcha;
  if (!g) {
    throw new Error('reCAPTCHA not available');
  }
  return new Promise((resolve, reject) => {
    g.ready(() => {
      void g
        .execute(siteKey, { action: 'register' })
        .then(resolve)
        .catch(reject);
    });
  });
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, error, loading } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center justify-center px-4 py-12">
      <motion.div
        className="pointer-events-none absolute left-[5%] top-[20%] opacity-50"
        animate={{ rotate: [0, 4, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      >
        <img src="/cards/bastoni10.png" alt="" className="w-24 rounded-md border border-gold/20 shadow-lg md:w-32" />
      </motion.div>

      <GlassPanel className="relative z-10 w-full max-w-md p-8 md:p-10">
        <h1 className="mb-2 text-center font-display text-3xl text-gradient-gold">Unisciti al circolo</h1>
        <p className="mb-8 text-center font-body text-gold/70">Crea il tuo profilo da giocatore.</p>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLocalError(null);
            if (password !== confirm) {
              setLocalError('Le password non coincidono.');
              return;
            }
            try {
              const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
              let captchaToken: string | undefined;
              if (siteKey) {
                try {
                  captchaToken = await getRecaptchaToken(siteKey);
                } catch {
                  setLocalError('Verifica CAPTCHA non riuscita. Riprova.');
                  return;
                }
              }
              await register({
                username,
                email,
                password,
                ...(captchaToken ? { captchaToken } : {}),
              });
              navigate('/lobby');
            } catch {
              /* store */
            }
          }}
        >
          <Input id="username" label="Nome utente" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            id="confirm"
            label="Conferma password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {(localError || error) && (
            <p className="text-center font-body text-sm text-red-300/90">{localError ?? error}</p>
          )}
          <Button type="submit" variant="primary" className="w-full py-3" disabled={loading}>
            {loading ? 'Creazione…' : 'Registrati'}
          </Button>
        </form>

        <p className="mt-8 text-center font-body text-gold/70">
          Hai già un account?{' '}
          <Link to="/login" className="text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">
            Accedi
          </Link>
        </p>
      </GlassPanel>
    </div>
  );
}
