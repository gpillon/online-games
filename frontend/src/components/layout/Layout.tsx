import { Header } from '@/components/layout/Header';
import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="particles-bg">
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: `${(i * 7) % 100}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${7 + (i % 5)}s`,
            }}
          />
        ))}
      </div>
      <Header />
      <motion.main
        className="relative z-10 flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <Outlet />
      </motion.main>
    </div>
  );
}
