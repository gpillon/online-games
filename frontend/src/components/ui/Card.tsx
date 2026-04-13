import type { HTMLAttributes, ReactNode } from 'react';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Walnut glass panel — not a playing card */
export function GlassPanel({ children, className = '', ...rest }: GlassPanelProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border border-gold/35 bg-black/35
        shadow-gold backdrop-blur-md gold-border-inner
        ${className}
      `}
      {...rest}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
