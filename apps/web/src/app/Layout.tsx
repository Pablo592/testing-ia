// Layout de las pantallas con sesión: barra superior (§5.11) con el único h1,
// "<nombre> · <rol>" (HU-01/CA-U04), "Gestión" para el encargado y "Cerrar
// sesión"; avisos de inactividad y de caducidad; "Acceso denegado" (§5.13).
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import type { Permission } from '@mi-app/shared/permissions';
import { keepAlive, logout, useSession } from '../session/store.ts';
import { Notice, ROLE_TEXT, ScreenTitle, useDocumentTitle } from '../ui/components.tsx';
import { LucideIcon, type IconName } from '../ui/icons.tsx';

/**
 * Menú "Gestión" del encargado (flujos.md §0, wireframe 06, design-system §5.11;
 * H-2.3-01): siempre las 5 opciones y en este orden; la de la pantalla actual
 * no se oculta, se marca "Estás aquí" y `aria-current="page"`.
 */
const GESTION: { label: string; to: string; permission: Permission; icon: IconName }[] = [
  { label: 'Pedidos', to: '/pedidos', permission: 'order:read', icon: 'clipboard-list' },
  { label: 'Cola de barra', to: '/cola', permission: 'kitchen:read', icon: 'layout-grid' },
  { label: 'Menú', to: '/menu', permission: 'menu:manage', icon: 'coffee' },
  { label: 'Personal', to: '/personal', permission: 'staff:read', icon: 'user' },
  { label: 'Resumen del día', to: '/resumen', permission: 'reports:read', icon: 'euro' },
];

const TIME = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

/**
 * Se cierra con Escape, al tocar fuera, al elegir una opción y al salir del
 * panel con Tab; el foco vuelve al botón "Gestión" (nunca a `body`, H-2.3-03).
 * A <= 767 px el panel ocupa todo el ancho bajo la barra y no la tapa (H-2.3-05).
 */
function GestionMenu({ permissions }: { permissions: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const location = useLocation();
  const options = GESTION.filter((g) => permissions.includes(g.permission));

  const close = useCallback((focusButton: boolean) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);
  // Al abrir, el foco va a la primera opción (wireframe 06).
  useEffect(() => {
    if (open) listRef.current?.querySelector('a')?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Si el toque no deja el foco en otro control, vuelve al botón.
        requestAnimationFrame(() => {
          const active = document.activeElement;
          if (!active || active === document.body) buttonRef.current?.focus();
        });
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open, close]);

  function onListKey(e: ReactKeyboardEvent<HTMLUListElement>) {
    if (e.key !== 'Tab') return;
    const links = [...e.currentTarget.querySelectorAll('a')];
    const active = document.activeElement;
    if ((!e.shiftKey && active === links[links.length - 1]) || (e.shiftKey && active === links[0])) {
      e.preventDefault();
      close(true);
    }
  }

  return (
    <div className="menu" ref={wrapRef}>
      <button
        type="button"
        ref={buttonRef}
        className="btn btn-secondary"
        aria-label="Menú de gestión"
        aria-expanded={open}
        aria-controls="menu-gestion"
        onClick={() => setOpen((o) => !o)}
      >
        <LucideIcon name="menu" />
        Gestión
      </button>
      {open ? (
        <ul id="menu-gestion" className="menu-list" ref={listRef} onKeyDown={onListKey}>
          {options.map((g) => {
            const current = location.pathname === g.to;
            return (
              <li key={g.to}>
                <Link
                  to={g.to}
                  aria-current={current ? 'page' : undefined}
                  className={current ? 'menu-current' : undefined}
                  onClick={(e) => {
                    if (current) {
                      // Llevar a la misma pantalla no hace nada y cierra el menú.
                      e.preventDefault();
                      close(true);
                    } else {
                      setOpen(false);
                    }
                  }}
                >
                  <LucideIcon name={g.icon} />
                  <span className="menu-label">{g.label}</span>
                  {current ? (
                    <span className="menu-here" aria-hidden="true">
                      Estás aquí
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  const titleRef = useRef<HTMLHeadingElement>(null);
  useDocumentTitle(title);
  const me = session.me;
  if (!me) return null;
  const isManager = me.user.role === 'manager' && !me.user.mustChangePin;
  return (
    <>
      <header className={isManager ? 'topbar has-gestion' : 'topbar'}>
        <ScreenTitle title={title} focusKey={`${location.pathname}:${title}`} headingRef={titleRef} />
        {isManager ? <GestionMenu permissions={me.permissions} /> : null}
        <span className="topbar-user">{`${me.user.name} · ${ROLE_TEXT[me.user.role]}`}</span>
        <button type="button" className="btn btn-secondary topbar-logout" onClick={() => void logout()}>
          <LucideIcon name="log-out" />
          Cerrar sesión
        </button>
      </header>
      {session.idleWarning || session.expiryWarning ? (
        <div className="session-notices">
          {session.idleWarning ? (
            <Notice icon="alert" role="status">
              <p>Tu sesión se cerrará en 60 s por inactividad</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  keepAlive();
                  // El aviso desaparece: el foco pasa al h1 de la pantalla (H-2.3-03).
                  titleRef.current?.focus();
                }}
              >
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
