// Campo de PIN: etiqueta visible, `type="password"` (nunca muestra dígitos) y
// descarta cualquier tecla que no sea 0–9 (01-login.md). `inputmode="none"`:
// acepta el teclado físico pero no abre el teclado del sistema encima del
// teclado propio (H-2.3-02). Seis indicadores ● / ○ muestran cuántos dígitos hay
// (H-2.3-08); el lector de pantalla oye "N de 6 dígitos".
import type { RefObject } from 'react';

export const PIN_MAX = 6;

export function pinLabel(isManager: boolean): string {
  return isManager ? 'PIN (6 dígitos)' : 'PIN (4 a 6 dígitos)';
}

export interface PinFieldProps {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  describedBy?: string;
  onChange(value: string): void;
  onEnter(): void;
}

export function PinField({ id, label, value, disabled, inputRef, describedBy, onChange, onEnter }: PinFieldProps) {
  const counterId = `${id}-contador`;
  const slots = Array.from({ length: PIN_MAX }, (_, i) => i < value.length);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pin-box">
        <input
          id={id}
          ref={inputRef}
          className="pin-input"
          type="password"
          inputMode="none"
          autoComplete="off"
          maxLength={PIN_MAX}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy ? `${counterId} ${describedBy}` : counterId}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, PIN_MAX))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnter();
            }
          }}
        />
        <span className="pin-dots" aria-hidden="true">
          {slots.map((filled, i) => (
            <span key={i} className={filled ? 'pin-dot pin-dot-filled' : 'pin-dot'} />
          ))}
        </span>
      </div>
      <span id={counterId} className="visually-hidden">
        {`${value.length} de ${PIN_MAX} dígitos`}
      </span>
    </div>
  );
}
