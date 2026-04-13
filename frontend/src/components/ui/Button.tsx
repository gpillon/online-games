import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonHTMLSafe = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>;

type Variant = 'primary' | 'secondary' | 'ghost';

const variants: Record<
  Variant,
  string
> = {
  primary:
    'bg-gradient-to-b from-gold-bright/95 to-gold/90 text-walnut-mid font-semibold shadow-gold hover:shadow-gold-glow border border-gold-bright/50',
  secondary:
    'bg-gradient-to-b from-burgundy-light/95 to-burgundy text-ivory border border-gold/30 hover:border-gold/60 shadow-md',
  ghost:
    'bg-transparent text-gold border border-gold/25 hover:bg-gold/10 hover:border-gold/50',
};

export interface ButtonProps extends ButtonHTMLSafe {
  variant?: Variant;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        relative overflow-hidden rounded-md px-5 py-2.5 font-display text-sm tracking-wide
        transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70
        disabled:pointer-events-none disabled:opacity-45
        ${variants[variant]}
        ${className}
      `}
      disabled={disabled}
      {...rest}
    >
      <span className="relative z-10">{children}</span>
      {variant === 'primary' && (
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-opacity hover:opacity-100" />
      )}
    </motion.button>
  );
}
