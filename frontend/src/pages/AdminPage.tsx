import type { AdminUserView } from '@online-games/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Crown,
  KeyRound,
  LayoutDashboard,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  Unlock,
  UserCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { apiFetch } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface AdminStats {
  totalUsers: number;
  blockedUsersCount: number;
  adminUsersCount: number;
  totalRooms: number;
  waitingRoomsCount: number;
  activeGamesCount: number;
  finishedRoomsCount: number;
  runningGameEnginesCount: number;
}

interface UsersPage {
  items: AdminUserView[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 15;

function roleBadge(role: string) {
  if (role === 'admin')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-gold">
        <Shield className="h-3 w-3" /> Admin
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ivory/10 px-2 py-0.5 text-xs text-ivory/70">
      Utente
    </span>
  );
}

function boolBadge(val: boolean, trueLabel: string, falseLabel: string, trueColor = 'text-emerald-400', falseColor = 'text-red-400') {
  return (
    <span className={`text-xs font-medium ${val ? trueColor : falseColor}`}>
      {val ? trueLabel : falseLabel}
    </span>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [tab, setTab] = useState<'dashboard' | 'users'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersPage, setUsersPage] = useState<UsersPage | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({ open: false, title: '', message: '', action: async () => {} });

  const [emailModal, setEmailModal] = useState<{ open: boolean; userId: string; username: string }>({
    open: false, userId: '', username: '',
  });
  const [emailInput, setEmailInput] = useState('');
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; userId: string; username: string }>({
    open: false, userId: '', username: '',
  });
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const s = await apiFetch<AdminStats>('/admin/stats', { token });
      setStats(s);
    } catch {
      /* ignore */
    }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(LIMIT));
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter) params.set('role', roleFilter);
      const res = await apiFetch<UsersPage>(`/admin/users?${params.toString()}`, { token });
      setUsersPage(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }, [token, page, search, roleFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
  }, [tab, fetchUsers]);

  const adminAction = async (
    url: string,
    method: 'PATCH' | 'DELETE' = 'PATCH',
    body?: unknown,
  ) => {
    if (!token) return;
    try {
      await apiFetch(url, { method, token, body });
      await fetchUsers();
      await fetchStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    }
  };

  const confirmAndRun = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmModal({ open: true, title, message, action });
  };

  const totalPages = usersPage ? Math.ceil(usersPage.total / LIMIT) : 1;

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Crown className="h-8 w-8 text-gold" />
        <div>
          <h1 className="font-display text-3xl text-gradient-gold">Pannello Admin</h1>
          <p className="font-body text-sm text-gold/60">Gestione utenti, stanze e sistema</p>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        <Button
          variant={tab === 'dashboard' ? 'primary' : 'ghost'}
          onClick={() => setTab('dashboard')}
          className="flex items-center gap-2"
        >
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </Button>
        <Button
          variant={tab === 'users' ? 'primary' : 'ghost'}
          onClick={() => setTab('users')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" /> Utenti
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <DashboardTab stats={stats} onRefresh={fetchStats} />
          </motion.div>
        )}
        {tab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                <input
                  className="w-full rounded-lg border border-gold/30 bg-black/30 py-2 pl-10 pr-4 font-body text-sm text-ivory placeholder:text-gold/40 focus:border-gold/60 focus:outline-none"
                  placeholder="Cerca username o email…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <select
                className="rounded-lg border border-gold/30 bg-black/30 px-3 py-2 font-body text-sm text-ivory focus:border-gold/60 focus:outline-none"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tutti i ruoli</option>
                <option value="user">Utente</option>
                <option value="admin">Admin</option>
              </select>
              <Button variant="ghost" onClick={fetchUsers} className="flex items-center gap-1 text-xs">
                <RefreshCw className="h-3 w-3" /> Aggiorna
              </Button>
            </div>

            {error && (
              <GlassPanel className="mb-4 p-3 text-center text-sm text-red-400">{error}</GlassPanel>
            )}

            {loading ? (
              <GlassPanel className="flex items-center justify-center p-12">
                <motion.div
                  className="h-10 w-10 rounded-full border-2 border-gold/40 border-t-gold"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
              </GlassPanel>
            ) : usersPage && usersPage.items.length > 0 ? (
              <>
                <GlassPanel className="overflow-x-auto p-0">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gold/20 font-display text-xs uppercase tracking-wider text-gold/70">
                        <th className="px-4 py-3">Username</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Ruolo</th>
                        <th className="px-4 py-3">Stato</th>
                        <th className="px-4 py-3">Email verificata</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Registrato</th>
                        <th className="px-4 py-3 text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersPage.items.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-gold/10 font-body text-ivory/90 transition hover:bg-gold/5"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium">{u.username}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-ivory/60">
                            {u.email ?? '—'}
                          </td>
                          <td className="px-4 py-3">{roleBadge(u.role)}</td>
                          <td className="px-4 py-3">
                            {boolBadge(!u.isBlocked, 'Attivo', 'Bloccato')}
                          </td>
                          <td className="px-4 py-3">
                            {boolBadge(u.isEmailVerified, 'Si', 'No')}
                          </td>
                          <td className="px-4 py-3">
                            {u.isAnonymous ? (
                              <span className="text-xs text-ivory/50">Anonimo</span>
                            ) : (
                              <span className="text-xs text-ivory/80">Registrato</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-ivory/50">
                            {new Date(u.createdAt).toLocaleDateString('it-IT')}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <UserActions
                              u={u}
                              currentUserId={user.id}
                              onBlock={() =>
                                confirmAndRun(
                                  'Blocca utente',
                                  `Bloccare ${u.username}?`,
                                  () => adminAction(`/admin/users/${u.id}/block`),
                                )
                              }
                              onUnblock={() => adminAction(`/admin/users/${u.id}/unblock`)}
                              onActivate={() => adminAction(`/admin/users/${u.id}/activate`)}
                              onMakeAdmin={() =>
                                confirmAndRun(
                                  'Promuovi ad admin',
                                  `Promuovere ${u.username} ad admin?`,
                                  () => adminAction(`/admin/users/${u.id}/role`, 'PATCH', { role: 'admin' }),
                                )
                              }
                              onRemoveAdmin={() =>
                                confirmAndRun(
                                  'Rimuovi admin',
                                  `Rimuovere i privilegi admin di ${u.username}?`,
                                  () => adminAction(`/admin/users/${u.id}/role`, 'PATCH', { role: 'user' }),
                                )
                              }
                              onDelete={() =>
                                confirmAndRun(
                                  'Elimina utente',
                                  `Eliminare definitivamente ${u.username}? L'operazione è irreversibile.`,
                                  () => adminAction(`/admin/users/${u.id}`, 'DELETE'),
                                )
                              }
                              onSetEmail={() => {
                                setEmailInput('');
                                setEmailModal({ open: true, userId: u.id, username: u.username });
                              }}
                              onSetPassword={() => {
                                setPasswordInput('');
                                setPasswordModal({ open: true, userId: u.id, username: u.username });
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </GlassPanel>

                <div className="mt-4 flex items-center justify-between">
                  <p className="font-body text-xs text-gold/60">
                    {usersPage.total} utenti totali — Pagina {page} di {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <ChevronLeft className="h-3 w-3" /> Prec.
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="flex items-center gap-1 text-xs"
                    >
                      Succ. <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <GlassPanel className="p-8 text-center font-body text-gold/60">
                Nessun utente trovato.
              </GlassPanel>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal((m) => ({ ...m, open: false }))}
        title={confirmModal.title}
      >
        <p className="mb-6 font-body text-ivory/80">{confirmModal.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmModal((m) => ({ ...m, open: false }))}>
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              await confirmModal.action();
              setConfirmModal((m) => ({ ...m, open: false }));
            }}
          >
            Conferma
          </Button>
        </div>
      </Modal>

      <Modal
        open={emailModal.open}
        onClose={() => setEmailModal((m) => ({ ...m, open: false }))}
        title={`Imposta email per ${emailModal.username}`}
      >
        <p className="mb-4 font-body text-sm text-ivory/70">
          L'utente anonimo verrà convertito in utente registrato.
        </p>
        <input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="email@esempio.com"
          className="mb-6 w-full rounded-lg border border-gold/30 bg-black/30 px-3 py-2 font-body text-sm text-ivory placeholder:text-gold/40 focus:border-gold/60 focus:outline-none"
        />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setEmailModal((m) => ({ ...m, open: false }))}>
            Annulla
          </Button>
          <Button
            variant="primary"
            disabled={!emailInput.includes('@')}
            onClick={async () => {
              await adminAction(`/admin/users/${emailModal.userId}/email`, 'PATCH', { email: emailInput });
              setEmailModal((m) => ({ ...m, open: false }));
            }}
          >
            Salva
          </Button>
        </div>
      </Modal>

      <Modal
        open={passwordModal.open}
        onClose={() => setPasswordModal((m) => ({ ...m, open: false }))}
        title={`Imposta password per ${passwordModal.username}`}
      >
        <input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          placeholder="Nuova password (min 6 caratteri)"
          className="mb-6 w-full rounded-lg border border-gold/30 bg-black/30 px-3 py-2 font-body text-sm text-ivory placeholder:text-gold/40 focus:border-gold/60 focus:outline-none"
        />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setPasswordModal((m) => ({ ...m, open: false }))}>
            Annulla
          </Button>
          <Button
            variant="primary"
            disabled={passwordInput.length < 6}
            onClick={async () => {
              await adminAction(`/admin/users/${passwordModal.userId}/password`, 'PATCH', { password: passwordInput });
              setPasswordModal((m) => ({ ...m, open: false }));
            }}
          >
            Salva
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function DashboardTab({ stats, onRefresh }: { stats: AdminStats | null; onRefresh: () => void }) {
  if (!stats) {
    return (
      <GlassPanel className="flex items-center justify-center p-12">
        <motion.div
          className="h-10 w-10 rounded-full border-2 border-gold/40 border-t-gold"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      </GlassPanel>
    );
  }

  const cards: { label: string; value: number; icon: typeof Users; color: string }[] = [
    { label: 'Utenti totali', value: stats.totalUsers, icon: Users, color: 'text-gold' },
    { label: 'Admin', value: stats.adminUsersCount, icon: Shield, color: 'text-amber-400' },
    { label: 'Bloccati', value: stats.blockedUsersCount, icon: Ban, color: 'text-red-400' },
    { label: 'Stanze totali', value: stats.totalRooms, icon: LayoutDashboard, color: 'text-emerald-400' },
    { label: 'In attesa', value: stats.waitingRoomsCount, icon: UserCheck, color: 'text-sky-400' },
    { label: 'Partite attive', value: stats.activeGamesCount, icon: Crown, color: 'text-gold' },
    { label: 'Concluse', value: stats.finishedRoomsCount, icon: CheckCircle, color: 'text-ivory/50' },
    { label: 'Engine attivi', value: stats.runningGameEnginesCount, icon: RefreshCw, color: 'text-purple-400' },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="ghost" onClick={onRefresh} className="flex items-center gap-1 text-xs">
          <RefreshCw className="h-3 w-3" /> Aggiorna
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <GlassPanel key={c.label} className="flex flex-col items-center gap-2 p-5 text-center">
            <c.icon className={`h-6 w-6 ${c.color}`} />
            <span className="font-display text-2xl text-ivory">{c.value}</span>
            <span className="font-body text-xs text-gold/60">{c.label}</span>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

function UserActions({
  u,
  currentUserId,
  onBlock,
  onUnblock,
  onActivate,
  onMakeAdmin,
  onRemoveAdmin,
  onDelete,
  onSetEmail,
  onSetPassword,
}: {
  u: AdminUserView;
  currentUserId: string;
  onBlock: () => void;
  onUnblock: () => void;
  onActivate: () => void;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onDelete: () => void;
  onSetEmail: () => void;
  onSetPassword: () => void;
}) {
  const isSelf = u.id === currentUserId;

  return (
    <div className="flex items-center justify-end gap-1">
      {u.isAnonymous && (
        <button
          type="button"
          onClick={onSetEmail}
          className="rounded p-1.5 text-sky-400 hover:bg-sky-400/10"
          title="Imposta email (converti in registrato)"
        >
          <Mail className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onSetPassword}
        className="rounded p-1.5 text-amber-300 hover:bg-amber-300/10"
        title="Imposta password"
      >
        <KeyRound className="h-4 w-4" />
      </button>
      {!u.isEmailVerified && !u.isAnonymous && (
        <button
          type="button"
          onClick={onActivate}
          className="rounded p-1.5 text-emerald-400 hover:bg-emerald-400/10"
          title="Attiva email"
        >
          <UserCheck className="h-4 w-4" />
        </button>
      )}
      {u.isBlocked ? (
        <button
          type="button"
          onClick={onUnblock}
          className="rounded p-1.5 text-emerald-400 hover:bg-emerald-400/10"
          title="Sblocca"
        >
          <Unlock className="h-4 w-4" />
        </button>
      ) : (
        !isSelf && (
          <button
            type="button"
            onClick={onBlock}
            className="rounded p-1.5 text-red-400 hover:bg-red-400/10"
            title="Blocca"
          >
            <Ban className="h-4 w-4" />
          </button>
        )
      )}
      {u.role === 'admin'
        ? !isSelf && (
            <button
              type="button"
              onClick={onRemoveAdmin}
              className="rounded p-1.5 text-amber-400 hover:bg-amber-400/10"
              title="Rimuovi admin"
            >
              <ShieldOff className="h-4 w-4" />
            </button>
          )
        : (
            <button
              type="button"
              onClick={onMakeAdmin}
              className="rounded p-1.5 text-gold hover:bg-gold/10"
              title="Promuovi ad admin"
            >
              <Shield className="h-4 w-4" />
            </button>
          )}
      {!isSelf && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1.5 text-red-500 hover:bg-red-500/10"
          title="Elimina"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
