import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginAnonymous, error, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl flex-col items-center justify-center gap-10 px-4 py-12 md:flex-row">
      <div className="pointer-events-none absolute left-[8%] top-[18%] hidden md:block">
        <motion.img
          src="/cards/spade1.png"
          alt=""
          className="w-28 rotate-[-18deg] rounded-md border border-gold/25 opacity-60 shadow-xl"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </div>
      <div className="pointer-events-none absolute bottom-[12%] right-[6%] hidden md:block">
        <motion.img
          src="/cards/coppe7.png"
          alt=""
          className="w-32 rotate-[14deg] rounded-md border border-gold/25 opacity-55 shadow-xl"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      <GlassPanel className="relative z-10 w-full max-w-md p-8 md:p-10">
        <h1 className="mb-2 text-center font-display text-3xl text-gradient-gold">Bentornato</h1>
        <p className="mb-8 text-center font-body text-gold/70">Accedi per prendere posto al tavolo.</p>

        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await login({ email, password });
              navigate('/lobby');
            } catch {
              /* surfaced via store */
            }
          }}
        >
          <Input id="email" label="Email o username" type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-center font-body text-sm text-red-300/90">{error}</p>}
          <Button type="submit" variant="primary" className="w-full py-3" disabled={loading}>
            {loading ? 'Accesso…' : 'Accedi'}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gold/20" />
          <span className="font-display text-xs uppercase tracking-widest text-gold/50">oppure</span>
          <span className="h-px flex-1 bg-gold/20" />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full py-3"
          disabled={loading}
          onClick={async () => {
            try {
              await loginAnonymous();
              navigate('/lobby');
            } catch {
              /* store */
            }
          }}
        >
          Gioca come Anonimo
        </Button>

        <p className="mt-8 text-center font-body text-gold/70">
          Non hai un account?{' '}
          <Link to="/register" className="text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">
            Registrati
          </Link>
        </p>
      </GlassPanel>
    </div>
  );
}
