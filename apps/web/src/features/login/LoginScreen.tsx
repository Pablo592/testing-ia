// P-01 Inicio de sesión (HU-01; docs/ux/wireframes/01-login.md): paso 1 elegir
// o escribir el usuario, paso 2 PIN con teclado. Mensajes y bloqueos con los
// textos exactos del wireframe; el tiempo lo da el servidor (retryAfterSeconds).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LoginOption, LoginResponse } from '@mi-app/shared/api';
import type { Role } from '@mi-app/shared/pin';
import { retryMinutes } from '@mi-app/shared/retry';
import { api, retryAfterOf } from '../../api/client.ts';
import { clearBanner, loginSucceeded, useSession, type BannerKey } from '../../session/store.ts';
import { APP_NAME, ErrorText, Keypad, Notice, ROLE_TEXT, useDocumentTitle, useNow, type NoticeIcon } from '../../ui/components.tsx';
import { PIN_MAX, PinField, pinLabel } from './PinField.tsx';

export const BANNER_TEXT: Record<BannerKey, { text: string; icon: NoticeIcon }> = {
  idle: { text: 'Sesión cerrada por inactividad.', icon: 'info' },
  absolute: { text: 'La sesión ha caducado por duración máxima. Vuelve a entrar con tu PIN.', icon: 'info' },
  user_disabled: { text: 'Usuario desactivado, contacta con el encargado.', icon: 'alert' },
  pin_reset: { text: 'El encargado ha restablecido tu PIN: entra con el PIN provisional.', icon: 'info' },
  pin_changed: { text: 'Has cambiado tu PIN en otro dispositivo: vuelve a entrar.', icon: 'info' },
  account_locked_manual: { text: 'Cuenta bloqueada. Pide al encargado que la desbloquee.', icon: 'lock' },
  desconocido: { text: 'La sesión se ha cerrado. Vuelve a entrar con tu PIN.', icon: 'info' },
};

export const deviceText = (min: number) => `Demasiados intentos desde este dispositivo. Espera ${min} min.`;

/** Tarjetas del esqueleto de carga de la rejilla (wireframe 01: 4 tarjetas). */
const SKELETON_SLOTS = [0, 1, 2, 3] as const;

/** El 429 del dispositivo afecta a todos los usuarios: se recuerda mientras dure. */
let deviceBlockedUntil = 0;

type Message =
  | { kind: 'credentials' }
  | { kind: 'disabled' }
  | { kind: 'network' }
  | { kind: 'temporary'; until: number }
  | { kind: 'manual' }
  | { kind: 'device' };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0] ?? '';
  return (parts.length > 1 ? (a[0] ?? '') + (parts[1]?.[0] ?? '') : a.slice(0, 2)).toUpperCase();
}

export function LoginScreen() {
  const session = useSession();
  useDocumentTitle('Inicio de sesión');
  const [users, setUsers] = useState<LoginOption[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [writing, setWriting] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [selected, setSelected] = useState<{ name: string; role?: Role } | null>(null);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [deviceUntil, setDeviceUntil] = useState(deviceBlockedUntil);
  const [loading, setLoading] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);
  const userInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const bannersRef = useRef<HTMLDivElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const tempUntil = message?.kind === 'temporary' ? message.until : 0;
  const now = useNow(tempUntil > Date.now() || deviceUntil > Date.now());
  const deviceBlocked = deviceUntil > now;
  const tempBlocked = tempUntil > now;
  const manualBlocked = message?.kind === 'manual';

  const blockDevice = useCallback((seconds: number) => {
    deviceBlockedUntil = Date.now() + seconds * 1000;
    setDeviceUntil(deviceBlockedUntil);
  }, []);

  // Rejilla de P-01. Sin red o con 5xx se reintenta sola cada 3 s mientras P-01
  // esté abierta (el aviso "No se ha podido conectar" se ve entretanto).
  useEffect(() => {
    let cancel = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const r = await api<LoginOption[]>('GET', '/auth/login-options', { publicRoute: true });
      if (cancel) return;
      if (r.ok && Array.isArray(r.data)) {
        setUsers([...r.data].sort((a, b) => a.name.localeCompare(b.name, 'es')));
        setLoadFailed(false);
        return;
      }
      if (r.status === 429) blockDevice(retryAfterOf(r));
      setUsers((prev) => prev ?? []);
      setLoadFailed(r.status !== 429);
      if (r.network || r.status >= 500) retry = setTimeout(() => void load(), 3000);
    };
    void load();
    return () => {
      cancel = true;
      if (retry !== undefined) clearTimeout(retry);
    };
  }, [blockDevice, reloadKey]);

  // design-system §5.12: "Cargando usuarios…" solo si la rejilla tarda más de 1 s.
  const [slowLoad, setSlowLoad] = useState(false);
  const waitingUsers = users === null;
  useEffect(() => {
    if (!waitingUsers) {
      setSlowLoad(false);
      return;
    }
    const t = setTimeout(() => setSlowLoad(true), 1000);
    return () => clearTimeout(t);
  }, [waitingUsers]);

  // H-2.3-10: al volver a P-01 por un cierre del sistema, el foco va al banner
  // con el motivo (va justo antes del h1 en el orden de lectura).
  const hasBanner = session.banner !== null;
  useEffect(() => {
    if (hasBanner) bannersRef.current?.focus();
  }, [hasBanner]);

  useEffect(() => {
    if (selected) headingRef.current?.focus();
  }, [selected]);

  // Al acabar un bloqueo temporal el bloque desaparece y el teclado se habilita solo.
  useEffect(() => {
    if (message?.kind === 'temporary' && !tempBlocked) setMessage(null);
    if (message?.kind === 'device' && !deviceBlocked) setMessage(null);
  }, [message, tempBlocked, deviceBlocked]);

  function choose(u: { name: string; role?: Role }) {
    clearBanner();
    setSelected(u);
    setPin('');
    setMessage(deviceUntil > Date.now() ? { kind: 'device' } : null);
  }

  function changeUser() {
    setSelected(null);
    setPin('');
    setMessage(null);
    setWriting(false);
    setTypedName('');
  }

  function continueWithTyped() {
    const name = typedName.trim();
    if (!name) return;
    const known = users?.find((u) => u.name.toLowerCase() === name.toLowerCase());
    choose(known ? { name: known.name, role: known.role } : { name });
  }

  const isManager = selected?.role === 'manager';
  const minLength = isManager ? 6 : 4;
  const blocked = deviceBlocked || tempBlocked || manualBlocked;

  /** H-2.3-03: el teclado y el campo se deshabilitan; el foco pasa al mensaje (nunca a body). */
  function focusMessage() {
    requestAnimationFrame(() => messageRef.current?.focus());
  }

  function retryLoad() {
    setLoadFailed(false);
    setUsers(null);
    setReloadKey((k) => k + 1);
  }

  async function submit() {
    if (!selected || loading || blocked || pin.length < minLength) return;
    setLoading(true);
    const sent = pin;
    // El PIN se vacía siempre tras la respuesta (CA-U03, RS-29b).
    setPin('');
    const r = await api<LoginResponse>('POST', '/auth/login', { body: { name: selected.name, pin: sent }, publicRoute: true });
    setLoading(false);
    if (r.ok && r.data) {
      await loginSucceeded(r.data);
      return;
    }
    const code = r.error?.code;
    if (r.status === 429) {
      blockDevice(retryAfterOf(r));
      setMessage({ kind: 'device' });
      focusMessage();
      return;
    }
    if (r.status === 423 && code === 'ACCOUNT_LOCKED_MANUAL') {
      setMessage({ kind: 'manual' });
      focusMessage();
      return;
    }
    if (r.status === 423) {
      setMessage({ kind: 'temporary', until: Date.now() + retryAfterOf(r) * 1000 });
      focusMessage();
      return;
    }
    if (r.status === 403 && code === 'USER_DISABLED') setMessage({ kind: 'disabled' });
    else if (r.network || r.status >= 500) setMessage({ kind: 'network' });
    else setMessage({ kind: 'credentials' });
    requestAnimationFrame(() => pinRef.current?.focus());
  }

  const banner = session.banner ? BANNER_TEXT[session.banner] : null;

  function renderMessage() {
    if (!message) return null;
    switch (message.kind) {
      case 'credentials':
        return <ErrorText>Usuario o PIN incorrectos</ErrorText>;
      case 'disabled':
        return <ErrorText>Usuario desactivado, contacta con el encargado</ErrorText>;
      case 'network':
        return <ErrorText>No se ha podido conectar. Reintenta.</ErrorText>;
      case 'temporary':
        return tempBlocked ? (
          <Notice icon="lock">
            <p>Demasiados intentos fallidos. Podrás volver a intentarlo en {retryMinutes((tempUntil - now) / 1000)} min.</p>
          </Notice>
        ) : null;
      case 'manual':
        return (
          <Notice icon="lock">
            <p>Cuenta bloqueada. Pide al encargado que la desbloquee.</p>
            {isManager ? <p>Si no hay otro encargado, contacta con el soporte técnico.</p> : null}
          </Notice>
        );
      case 'device':
        return deviceBlocked ? (
          <Notice icon="lock">
            <p>{deviceText(retryMinutes((deviceUntil - now) / 1000))}</p>
          </Notice>
        ) : null;
    }
  }

  return (
    <>
      <header className="topbar topbar-login">
        <span className="topbar-brand">{APP_NAME}</span>
        <span className="topbar-user">Sin sesión</span>
      </header>
      <main className="login">
        {!selected ? (
          <section aria-labelledby="quien-eres">
            <div className="login-banners" ref={bannersRef} tabIndex={-1}>
              {deviceBlocked ? (
                <Notice icon="lock" role="status">
                  <p>{deviceText(retryMinutes((deviceUntil - now) / 1000))}</p>
                </Notice>
              ) : null}
              {banner ? (
                <Notice icon={banner.icon} role="status">
                  <p>{banner.text}</p>
                </Notice>
              ) : null}
            </div>
            <h1 id="quien-eres">¿Quién eres?</h1>
            {users === null ? (
              <>
                {/* design-system §5.12: el texto solo aparece si la espera pasa de 1 s;
                    la línea se reserva para que el esqueleto no salte al mostrarlo. */}
                <p className="pin-help loading-text" role="status">
                  {slowLoad ? 'Cargando usuarios…' : ''}
                </p>
                {/* H-2.3-07, H-2.6-02: esqueleto de 4 tarjetas con la forma de las reales
                    (mismas clases de rejilla y tarjeta); decorativo para el lector de pantalla. */}
                <ul className="user-grid" aria-hidden="true">
                  {SKELETON_SLOTS.map((i) => (
                    <li key={i}>
                      <div className="user-card user-card-skeleton" data-testid="esqueleto-usuario" aria-hidden="true">
                        <span className="user-initials" />
                        <span className="user-name skeleton-line skeleton-line-name">{'\u00a0'}</span>
                        <span className="user-role skeleton-line skeleton-line-role">{'\u00a0'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {users !== null && users.length === 0 && !loadFailed && !deviceBlocked ? (
              <p className="pin-help">Todavía no hay usuarios. Pide al encargado que te dé de alta.</p>
            ) : null}
            {loadFailed ? (
              <div className="load-error" role="alert">
                <ErrorText>No se ha podido conectar. Reintenta.</ErrorText>
                <button type="button" className="btn btn-secondary" onClick={retryLoad}>
                  Reintentar
                </button>
              </div>
            ) : null}
            {users && users.length > 0 ? (
              <ul className="user-grid">
                {users.map((u) => (
                  <li key={u.name}>
                    <button type="button" className="user-card" onClick={() => choose(u)}>
                      <span className="user-initials" aria-hidden="true">
                        {initials(u.name)}
                      </span>
                      <span className="user-name">{u.name}</span>
                      <span className="user-role">{ROLE_TEXT[u.role]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {!writing ? (
              <p>
                ¿No apareces?{' '}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    clearBanner();
                    setWriting(true);
                    requestAnimationFrame(() => userInputRef.current?.focus());
                  }}
                >
                  Escribir mi usuario
                </button>
              </p>
            ) : (
              <form
                className="write-user"
                onSubmit={(e) => {
                  e.preventDefault();
                  continueWithTyped();
                }}
              >
                <div className="field">
                  <label htmlFor="usuario">Usuario</label>
                  <input
                    id="usuario"
                    ref={userInputRef}
                    className="text-input"
                    autoComplete="username"
                    maxLength={30}
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary" disabled={typedName.trim() === ''}>
                  Continuar
                </button>
              </form>
            )}
          </section>
        ) : (
          <section className="pin-step" aria-labelledby="saludo">
            <div className="pin-column">
              <button type="button" className="btn btn-secondary pin-back" onClick={changeUser}>
                <span aria-hidden="true">‹ </span>Cambiar de usuario
              </button>
              <h1 id="saludo" tabIndex={-1} ref={headingRef}>
                Hola, {selected.name}
                {selected.role ? ` (${ROLE_TEXT[selected.role]})` : ''}
              </h1>
              <PinField
                id="pin"
                label={pinLabel(isManager)}
                value={pin}
                disabled={blocked || loading}
                inputRef={pinRef}
                describedBy="pin-mensaje"
                onChange={setPin}
                onEnter={() => void submit()}
              />
              <div id="pin-mensaje" className="message" role="alert" tabIndex={-1} ref={messageRef}>
                {renderMessage()}
              </div>
              {!manualBlocked ? (
                <Keypad
                  onDigit={(d) => setPin((p) => (p.length < PIN_MAX ? p + d : p))}
                  onDelete={() => setPin((p) => p.slice(0, -1))}
                  digitsDisabled={blocked || loading || pin.length >= PIN_MAX}
                  deleteDisabled={blocked || loading || pin.length === 0}
                  action={{ label: loading ? 'Entrando…' : 'Entrar', disabled: blocked || loading || pin.length < minLength, onPress: () => void submit() }}
                />
              ) : null}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
