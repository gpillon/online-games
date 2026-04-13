import * as OG from '@online-games/shared';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/Card';
import { getGameEntry } from '@/games/registry';

const allCards = [
  'bastoni', 'coppe', 'denara', 'spade',
].flatMap((suit) =>
  Array.from({ length: 10 }, (_, i) => `/cards/${suit}${i + 1}.png`),
);

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const features = [
  {
    title: getGameEntry(OG.GameType.TRESSETTE).title,
    desc: getGameEntry(OG.GameType.TRESSETTE).subtitle,
    active: true,
    to: '/lobby',
  },
  {
    title: 'Scopa',
    desc: 'Presto disponibile — la regina dei giochi di raccolta.',
    active: false,
    to: '#',
  },
  {
    title: 'Briscola',
    desc: 'Presto disponibile — veloce, astuta, irresistibile.',
    active: false,
    to: '#',
  },
];

export function HomePage() {
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 400], [0, 80]);
  const heroCards = useMemo(() => pickRandom(allCards, 4), []);

  return (
    <div className="relative overflow-hidden">
      <motion.div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ y: bgY }}>
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4af37\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
      </motion.div>

      <section className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-24 pt-12 md:flex-row md:items-stretch md:pt-16">
        <div className="relative z-10 flex-1 space-y-8 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/30 px-4 py-1 font-display text-xs uppercase tracking-[0.35em] text-gold/80"
          >
            <Crown className="h-3.5 w-3.5" />
            Salotto italiano
          </motion.div>
          <motion.h1
            className="font-display text-5xl leading-tight text-gradient-gold md:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.65 }}
          >
            Arena di Carte
          </motion.h1>
          <motion.p
            className="mx-auto max-w-xl font-body text-xl text-ivory/85 md:mx-0 md:text-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Dove feltro verde, oro antico e legno scuro incontrano il gioco serio. Un tavolo virtuale degno
            della migliore società.
          </motion.p>
          <motion.div
            className="flex flex-wrap justify-center gap-4 md:justify-start"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5 }}
          >
            <Link to="/lobby">
              <Button variant="primary" className="min-w-[200px] px-8 py-3 text-base">
                Gioca Ora
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="ghost" className="min-w-[160px] border border-gold/40 py-3 text-base">
                Crea account
              </Button>
            </Link>
          </motion.div>
        </div>

        <div className="relative mt-16 flex h-[340px] w-full max-w-md flex-1 items-center justify-center md:mt-0 md:h-[420px]">
          <motion.div
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12),transparent_65%)] blur-2xl"
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          {heroCards.map((src, i) => {
            const rot = (i - 1.5) * 12;
            const y = Math.abs(i - 1.5) * 6;
            return (
              <motion.img
                key={src}
                src={src}
                alt=""
                className="playing-card-shadow absolute w-32 rounded-md border border-gold/30 md:w-40"
                initial={{ opacity: 0, rotate: rot - 20, y: 60 }}
                animate={{
                  opacity: 1,
                  rotate: rot,
                  y,
                  transition: { delay: 0.15 + i * 0.08, type: 'spring', stiffness: 120, damping: 14 },
                }}
                whileHover={{
                  y: y - 18,
                  rotate: rot + (i % 2 === 0 ? 4 : -4),
                  scale: 1.05,
                  zIndex: 20,
                  transition: { type: 'spring', stiffness: 280, damping: 18 },
                }}
                style={{ zIndex: i + 2, marginLeft: i * 18 - 36 }}
              />
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-24 md:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <GlassPanel
              className={`h-full p-6 transition-shadow hover:shadow-gold-glow ${
                f.active ? 'ring-1 ring-gold/50' : 'opacity-80'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-2xl text-ivory">{f.title}</h3>
                {f.active && <Sparkles className="h-5 w-5 text-gold" />}
              </div>
              <p className="mb-6 font-body text-lg text-gold/75">{f.desc}</p>
              {f.active ? (
                <Link to={f.to}>
                  <Button variant="secondary" className="w-full">
                    Entra
                  </Button>
                </Link>
              ) : (
                <Button variant="ghost" disabled className="w-full">
                  In arrivo
                </Button>
              )}
            </GlassPanel>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
