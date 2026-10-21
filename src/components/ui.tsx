import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-awake-blue text-white hover:bg-awake-blue-dark disabled:bg-awake-blue/40',
  accent: 'bg-awake-pink text-white hover:brightness-95 disabled:bg-awake-pink/40',
  outline: 'border border-awake-blue/30 bg-white text-awake-blue hover:border-awake-blue disabled:opacity-40',
  ghost: 'text-awake-blue hover:bg-awake-blue/5 disabled:opacity-40',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-40',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-awake-pink disabled:cursor-not-allowed ${
        size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-5 py-2.5 text-sm'
      } ${variants[variant]} ${className}`}
    />
  );
}

export function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'pink' | 'neutral' | 'warn' }) {
  const tones = {
    blue: 'bg-awake-blue-soft text-awake-blue',
    pink: 'bg-awake-pink-soft text-awake-pink',
    neutral: 'bg-awake-cream-dark text-awake-blue/80',
    warn: 'bg-amber-100 text-amber-800',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'ok' | 'error'; title?: string; children?: ReactNode }) {
  const tones = {
    info: 'border-awake-blue/20 bg-awake-blue-soft/60',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    error: 'border-red-300 bg-red-50 text-red-800',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`} role={tone === 'error' ? 'alert' : undefined}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-1 opacity-90' : ''}>{children}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="label-caps text-awake-pink">{eyebrow}</p>}
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-sm text-awake-blue/75">{children}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-awake-blue/60">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-awake-blue/20 bg-white px-3 py-2 text-sm text-awake-blue outline-none focus:border-awake-pink focus:ring-2 focus:ring-awake-pink/20';

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-awake-blue/70" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-awake-blue/20 border-t-awake-pink" />
      {label}
    </div>
  );
}
