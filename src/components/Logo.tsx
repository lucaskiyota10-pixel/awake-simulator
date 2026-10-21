/** Logotipo original extraído do brand board (não redesenhado). */
export default function Logo({ variant = 'blue', className = '' }: { variant?: 'blue' | 'white'; className?: string }) {
  return (
    <img
      src={variant === 'white' ? 'brand/awake-logo-white.png' : 'brand/awake-logo-blue.png'}
      alt="Awake. home decor"
      className={className}
      draggable={false}
    />
  );
}
