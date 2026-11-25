// Layout de las pantallas con sesión: barra superior (§5.11) con el único h1,
// "<nombre> · <rol>" (HU-01/CA-U04), "Gestión" para el encargado y "Cerrar
// sesión"; avisos de inactividad y de caducidad; "Acceso denegado" (§5.13).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import type { Permission } from '@mi-app/shared/permissions';
import { keepAlive, logout, useSession } from '../session/store.ts';
import { Notice, ROLE_TEXT, ScreenTitle, useDocumentTitle } from '../ui/components.tsx';

const GESTION: { label: string; to: string; permission: Permission }[] = [
  { label: 'Cola de barra', to: '/cola', permission: 'kitchen:read' },
  { label: 'Menú', to: '/menu', permission: 'menu:manage' },
  { label: 'Personal', to: '/personal', permission: 'staff:read' },
  { label: 'Resumen del día', to: '/resumen', permission: 'reports:read' },
];

const TIME = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

function GestionMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="btn btn-secondary" aria-expanded={open} aria-controls="menu-gestion" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">☰ </span>Gestión
      </button>
      {open ? (
        <ul id="menu-gestion" className="menu-list">
          {GESTION.map((g) => (
            <li key={g.to}>
              <Link to={g.to}>{g.label}</Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  useDocumentTitle(title);
  const me = session.me;
  if (!me) return null;
  const isManager = me.user.role === 'manager' && !me.user.mustChangePin;
  return (
    <>
      <header className="topbar">
        <ScreenTitle title={title} focusKey={`${location.pathname}:${title}`} />
        <div className="topbar-actions">
          <span className="topbar-user">{`${me.user.name} · ${ROLE_TEXT[me.user.role]}`}</span>
          {isManager ? <GestionMenu /> : null}
          <button type="button" className="btn btn-secondary" onClick={() => void logout()}>
            <span aria-hidden="true">⎋ </span>Cerrar sesión
          </button>
        </div>
      </header>
      {session.idleWarning || session.expiryWarning ? (
        <div className="session-notices">
          {session.idleWarning ? (
            <Notice icon="alert" role="status">
              <p>Tu sesión se cerrará en 60 s por inactividad</p>
              <button type="button" className="btn btn-secondary" onClick={keepAlive}>
                Seguir conectado
              </button>
            </Notice>
          ) : null}
          {session.expiryWarning ? (
            <Notice icon="info" role="status">
              <p>La sesión caduca a las {TIME.format(new Date(session.expiryWarning))}. Guarda lo que estés haciendo.</p>
              <button type="button" className="btn btn-secondary" onClick={() => void logout()}>
                Volver a entrar
              </button>
            </Notice>
          ) : null}
        </div>
      ) : null}
      <main className="content">{children}</main>
    </>
  );
}

export function homeFor(permissions: readonly string[]): string {
  return permissions.includes('order:read') ? '/pedidos' : '/cola';
}

/** Estado "Acceso denegado" (docs/ux/wireframes/10-acceso-denegado.md): el h1 lo pone la barra. */
export function AccessDeniedContent({ kitchen }: { kitchen: boolean }) {
  return (
    <div className="denied">
      <svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--color-text-secondary)">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <p className="denied-lead">No tienes permiso para ver esta pantalla.</p>
      <p className="denied-help">Si la necesitas, pide al encargado que revise tu rol.</p>
      <Link className="btn btn-primary" to={kitchen ? '/cola' : '/pedidos'}>
        {kitchen ? 'Ir a la cola' : 'Ir a Pedidos'}
      </Link>
    </div>
  );
}
