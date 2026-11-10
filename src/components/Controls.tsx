import { useId, type ReactNode } from 'react';

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

export function Stepper({ label, value, min, max, step, format = String, onChange }: StepperProps) {
  const round = (v: number) => Math.round(v * 100) / 100;
  const set = (v: number) => onChange(round(Math.min(max, Math.max(min, v))));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper-btn" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Less ${label.toLowerCase()}`}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10 H16" /></svg>
      </button>
      <output className="stepper-value" aria-live="polite">{format(value)}</output>
      <button type="button" className="stepper-btn" onClick={() => set(value + step)} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10 H16 M10 4 V16" /></svg>
      </button>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'segmented-opt is-on' : 'segmented-opt'}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={() => onChange(!checked)}>
      <span className="toggle-knob" />
    </button>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

/** One setting row: label on the left, control on the right, a painted line underneath. */
export function Field({ label, hint, children }: FieldProps) {
  const id = useId();
  return (
    <div className="field" aria-describedby={hint ? id : undefined}>
      <div className="field-text">
        <span className="field-label">{label}</span>
        {hint && <span className="field-hint" id={id}>{hint}</span>}
      </div>
      <div className="field-control">{children}</div>
    </div>
  );
}
