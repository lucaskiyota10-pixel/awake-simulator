import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Logo from './Logo';

const links = [
  { to: '/', label: 'Catálogo', end: true },
  { to: '/simulador', label: 'Simulador' },
  { to: '/composicoes', label: 'Composições' },
  { to: '/admin', label: 'Admin' },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-awake-blue text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <NavLink to="/" aria-label="Início">
            <Logo variant="white" className="h-9 w-auto" />
          </NavLink>
          <nav className="hidden gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `label-caps rounded-full px-4 py-2 transition ${isActive ? 'bg-white/10 text-white' : 'text-white/75 hover:text-white'}`
                }
              >
                {({ isActive }) => (
                  <span className={isActive ? 'border-b-2 border-awake-pink pb-0.5' : ''}>{l.label}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <button
            className="rounded-lg p-2 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {open && (
          <nav className="flex flex-col border-t border-white/10 px-4 pb-3 md:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `label-caps py-3 ${isActive ? 'text-awake-pink' : 'text-white/85'}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-awake-cream-dark bg-awake-cream">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-awake-blue/70 sm:flex-row sm:px-6">
          <Logo className="h-7 w-auto" />
          <span>Protótipo de simulação — preços ilustrativos, sem pagamentos.</span>
        </div>
      </footer>
    </div>
  );
}
