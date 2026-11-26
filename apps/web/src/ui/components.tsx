// Componentes del design system usados en HU-01 (docs/ux/design-system.md §5).
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Role } from '@mi-app/shared/pin';

export const ROLE_TEXT: Record<Role, string> = { waiter: 'Camarero', kitchen: 'Barra', manager: 'Encargado' };

export const APP_NAME = 'Café · Toma de pedidos';

/** Título del documento "<pantalla> · Café · Toma de pedidos" (WCAG 2.4.2). */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}

/** Reloj de 1 s para cuentas atrás (minutos redondeados hacia arriba). */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return active ? now : Date.now();
}

function LockIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export type NoticeIcon = 'lock' | 'info' | 'alert';

/** Bloque de estilo Aviso con icono decorativo (texto + icono + color). */
export function Notice({ icon, children, role }: { icon: NoticeIcon; children: ReactNode; role?: 'status' }) {
  return (
    <div className="notice" role={role}>
      {icon === 'lock' ? <LockIcon /> : icon === 'info' ? <InfoIcon /> : <AlertIcon />}
      <div>{children}</div>
    </div>
  );
}

/** Texto de error en línea (danger + icono). */
export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="error-text">
      <span aria-hidden="true">⚠ </span>
      {children}
    </p>
  );
}

export interface KeypadProps {
  onDigit(d: string): void;
  onDelete(): void;
  digitsDisabled: boolean;
  deleteDisabled: boolean;
  /** Tecla de acción (Entrar / Siguiente / Guardar PIN). */
  action: { label: string; disabled: boolean; onPress(): void };
}

/** Teclado numérico de §5.3: rejilla 3x4, teclas ≥ 72 px (64 px en móvil). */
export function Keypad({ onDigit, onDelete, digitsDisabled, deleteDisabled, action }: KeypadProps) {
  const key = (d: string) => (
    <button key={d} type="button" className="key" disabled={digitsDisabled} onClick={() => onDigit(d)}>
      {d}
    </button>
  );
  return (
    <div className="keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key)}
      <button type="button" className="key key-small" disabled={deleteDisabled} onClick={onDelete}>
        <span aria-hidden="true">⌫ </span>Borrar
      </button>
      {key('0')}
      <button type="button" className="key key-action" disabled={action.disabled} onClick={action.onPress}>
        {action.label}
      </button>
    </div>
  );
}

/** h1 de la barra superior: recibe el foco en cada cambio de pantalla (§5.11). */
export function ScreenTitle({ title, focusKey, headingRef }: { title: string; focusKey: string; headingRef?: RefObject<HTMLHeadingElement | null> }) {
  const own = useRef<HTMLHeadingElement>(null);
  const ref = headingRef ?? own;
  useEffect(() => {
    ref.current?.focus();
  }, [focusKey]);
  return (
    <h1 className="topbar-title" tabIndex={-1} ref={ref}>
      {title}
    </h1>
  );
}
