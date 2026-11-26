// Cambio obligatorio del PIN provisional (HU-07/CA-F04, CA-F09; HU-01/CA-F12;
// docs/ux/wireframes/01-login.md "Cambio obligatorio del PIN"). Tres pasos en
// la misma pantalla; currentPin y newPin se envían juntos en "Guardar PIN".
import { useEffect, useRef, useState } from 'react';
import { validatePin } from '@mi-app/shared/pin';
import { retryMinutes } from '@mi-app/shared/retry';
import { api, retryAfterOf } from '../../api/client.ts';
import { end, loadMe, showToast, useSession } from '../../session/store.ts';
import { ErrorText, Keypad, Notice, useNow } from '../../ui/components.tsx';
import { pinRuleHelp, pinRuleMessage } from '../pin/pin-messages.ts';
import { changePinLabel, PIN_MAX, PinField } from './PinField.tsx';
import { deviceText } from './LoginScreen.tsx';

type Step = 1 | 2 | 3;
type Message =
  | { kind: 'error'; text: string }
  | { kind: 'locked'; until: number }
  | { kind: 'device'; until: number };

const STEP_TEXT: Record<Step, string> = {
  1: 'Paso 1 de 3 · PIN actual (el provisional que te dio el encargado)',
  2: 'Paso 2 de 3 · PIN nuevo',
  3: 'Paso 3 de 3 · Repite el PIN nuevo',
};

export function ChangePinScreen() {
  const session = useSession();
  const role = session.me?.user.role ?? 'waiter';
  const isManager = role === 'manager';
  const minNew = isManager ? 6 : 4;
  const [step, setStep] = useState<Step>(1);
  // Los PIN solo viven en el estado de esta pantalla y se vacían tras cada respuesta.
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  const until = message && message.kind !== 'error' ? message.until : 0;
  const now = useNow(until > Date.now());
  const waiting = until > now;

  useEffect(() => {
    // Al acabar el bloqueo vuelve al paso 1 con el teclado habilitado (CA-F12 d).
    if (message && message.kind !== 'error' && !waiting) {
      setMessage(null);
      setStep(1);
    }
  }, [message, waiting]);

  const value = step === 1 ? current : step === 2 ? next : repeat;
  const setValue = step === 1 ? setCurrent : step === 2 ? setNext : setRepeat;
  const min = step === 1 ? 4 : minNew;

  function clearAll() {
    setCurrent('');
    setNext('');
    setRepeat('');
  }

  async function save() {
    setSaving(true);
    const body = { currentPin: current, newPin: next };
    clearAll();
    const r = await api('POST', '/auth/pin', { body });
    setSaving(false);
    if (r.status === 204) {
      showToast('PIN cambiado');
      await loadMe(false);
      return;
    }
    const code = r.error?.code;
    if (r.status === 403 && code === 'PIN_INVALID') {
      setMessage({ kind: 'error', text: 'El PIN actual no es correcto.' });
      setStep(1);
    } else if (r.status === 423 && code === 'ACCOUNT_LOCKED_MANUAL') {
      end('account_locked_manual');
    } else if (r.status === 423) {
      setMessage({ kind: 'locked', until: Date.now() + retryAfterOf(r) * 1000 });
      // H-2.3-03: teclado y botones quedan deshabilitados; el foco pasa al mensaje.
      requestAnimationFrame(() => messageRef.current?.focus());
      return;
    } else if (r.status === 429) {
      setMessage({ kind: 'device', until: Date.now() + retryAfterOf(r) * 1000 });
      requestAnimationFrame(() => messageRef.current?.focus());
      return;
    } else if (r.status === 400) {
      const issues = (r.error?.details as { issues?: { rule?: string }[] } | undefined)?.issues ?? [];
      setMessage({ kind: 'error', text: pinRuleMessage(issues[0]?.rule ?? '') });
      setStep(2);
    } else if (r.status !== 401 && r.status !== 403) {
      setMessage({ kind: 'error', text: 'No se ha podido guardar el PIN. Reintenta.' });
      setStep(1);
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function advance() {
    if (waiting || saving || value.length < min) return;
    if (step === 1) {
      setMessage(null);
      setStep(2);
    } else if (step === 2) {
      const v = validatePin(next, role);
      if (!v.ok) {
        setMessage({ kind: 'error', text: pinRuleMessage(v.rule) });
        setNext('');
        return;
      }
      setMessage(null);
      setStep(3);
    } else if (repeat !== next) {
      setMessage({ kind: 'error', text: 'Los dos PIN no coinciden' });
      setNext('');
      setRepeat('');
      setStep(2);
    } else {
      void save();
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function back() {
    setMessage(null);
    if (step === 3) {
      setRepeat('');
      setStep(2);
    } else if (step === 2) {
      setNext('');
      setStep(1);
    }
  }

  const actionLabel = step === 3 ? (saving ? 'Guardando…' : 'Guardar PIN') : 'Siguiente';
  const disabled = waiting || saving;

  return (
    <section className="pin-step">
      <div className="pin-column">
        <p>Antes de seguir tienes que crear un PIN nuevo.</p>
        {/* H-2.3-04: el cambio de paso se anuncia (región de estado). */}
        <p id="paso-pin" role="status">
          {STEP_TEXT[step]}
        </p>
        <PinField
          id="pin-cambio"
          label={changePinLabel(step, isManager)}
          value={value}
          disabled={disabled}
          inputRef={inputRef}
          describedBy={step === 1 ? 'paso-pin pin-cambio-mensaje' : 'paso-pin pin-regla pin-cambio-mensaje'}
          onChange={setValue}
          onEnter={advance}
        />
        {step !== 1 ? (
          <p id="pin-regla" className="pin-help">
            {pinRuleHelp(isManager)}
          </p>
        ) : null}
        <div id="pin-cambio-mensaje" className="message" role="alert" tabIndex={-1} ref={messageRef}>
          {message?.kind === 'error' ? <ErrorText>{message.text}</ErrorText> : null}
          {message?.kind === 'locked' && waiting ? (
            <Notice icon="lock">
              <p>Cuenta bloqueada. Espera {retryMinutes((until - now) / 1000)} min.</p>
              <p>No se ha cambiado el PIN.</p>
            </Notice>
          ) : null}
          {message?.kind === 'device' && waiting ? (
            <Notice icon="lock">
              <p>{deviceText(retryMinutes((until - now) / 1000))}</p>
              <p>No se ha cambiado el PIN.</p>
            </Notice>
          ) : null}
        </div>
        <Keypad
          onDigit={(d) => setValue((p) => (p.length < PIN_MAX ? p + d : p))}
          onDelete={() => setValue((p) => p.slice(0, -1))}
          digitsDisabled={disabled || value.length >= PIN_MAX}
          deleteDisabled={disabled || value.length === 0}
          action={{ label: actionLabel, disabled: disabled || value.length < min, onPress: advance }}
        />
        {step !== 1 ? (
          <div className="change-actions">
            <button type="button" className="btn btn-secondary" onClick={back} disabled={disabled}>
              <span aria-hidden="true">‹ </span>Atrás
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
