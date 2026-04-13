import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import { Crown, LogOut, Menu, Sparkles, User } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Home' },
  { to: '/lobby', label: 'Sala' },
  { to: '/leaderboard', label: 'Classifica' },
];

export function Header() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gold/25 bg-walnut/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <motion.span
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 bg-burgundy/50 shadow-gold"
            whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.5 } }}
          >
            <Crown className="h-5 w-5 text-gold" />
          </motion.span>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg tracking-wide text-gradient-gold md:text-xl">
              Arena di Carte
            </span>
            <span className="hidden font-body text-xs text-gold/50 sm:block">Il salotto digitale delle carte italiane</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 font-display text-sm tracking-wide transition-colors
                ${isActive ? 'bg-gold/15 text-gold' : 'text-ivory/80 hover:bg-gold/10 hover:text-gold'}`
              }
            >
              {label}
            </NavLink>
          ))}
          {user ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `ml-2 inline-flex items-center gap-2 rounded-md border border-gold/30 px-3 py-2 font-display text-sm
                ${isActive ? 'bg-gold/15 text-gold' : 'text-ivory/90 hover:border-gold/50'}`
                }
              >
                <User className="h-4 w-4" />
                {user.username}
              </NavLink>
              <button
                type="button"
                onClick={() => logout()}
                className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-2 font-display text-xs text-gold/80 hover:bg-gold/10 hover:text-gold"
              >
                <LogOut className="h-4 w-4" />
                Esci
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="ml-2 rounded-md px-3 py-2 font-display text-sm text-gold/90 hover:text-gold"
              >
                Accedi
              </Link>
              <Link to="/register">
                <span className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-burgundy/40 px-3 py-2 font-display text-sm text-ivory hover:bg-burgundy/60">
                  <Sparkles className="h-4 w-4 text-gold" />
                  Registrati
                </span>
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <button
              type="button"
              onClick={logout}
              className="rounded-md p-2 text-gold/80 hover:bg-gold/10"
              aria-label="Esci"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            className="rounded-md p-2 text-gold hover:bg-gold/10"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-t border-gold/20 bg-walnut-mid md:hidden"
        >
          <div className="flex flex-col gap-1 px-4 py-3">
            {nav.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 font-display text-ivory hover:bg-gold/10"
              >
                {label}
              </NavLink>
            ))}
            {!user && (
              <>
                <Link to="/login" className="rounded-md px-3 py-2 text-gold" onClick={() => setOpen(false)}>
                  Accedi
                </Link>
                <Link to="/register" className="rounded-md px-3 py-2 text-ivory" onClick={() => setOpen(false)}>
                  Registrati
                </Link>
              </>
            )}
            {user && (
              <NavLink to="/profile" className="rounded-md px-3 py-2 text-ivory" onClick={() => setOpen(false)}>
                Profilo
              </NavLink>
            )}
          </div>
        </motion.div>
      )}

      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
    </header>
  );
}
