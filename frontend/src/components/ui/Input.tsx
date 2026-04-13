import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, className = '', ...rest },
  ref,
) {
  return (
    <div className={`group relative ${className}`}>
      <input
        ref={ref}
        id={id}
        placeholder=" "
        className="peer w-full rounded-md border border-gold/25 bg-black/30 px-3 pb-2 pt-5 font-body text-lg text-ivory outline-none transition-all focus:border-gold focus:ring-1 focus:ring-gold/40"
        {...rest}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3 top-3 font-display text-sm text-gold/60 transition-all peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-gold peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gold"
      >
        {label}
      </label>
    </div>
  );
});
