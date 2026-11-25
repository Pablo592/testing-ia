// Campo de PIN: etiqueta visible, `type="password"` (puntos, nunca dígitos) e
// `inputmode="numeric"`; descarta cualquier tecla que no sea 0–9 (01-login.md).
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
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={inputRef}
        className="pin-input"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={PIN_MAX}
        value={value}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, PIN_MAX))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </div>
  );
}
