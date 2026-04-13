import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { AdminPage } from '@/pages/AdminPage';
import { GameRoomPage } from '@/pages/GameRoomPage';
import { GamePage } from '@/pages/GamePage';
import { HomePage } from '@/pages/HomePage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { LobbyPage } from '@/pages/LobbyPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="/room/:roomId" element={<GameRoomPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}
