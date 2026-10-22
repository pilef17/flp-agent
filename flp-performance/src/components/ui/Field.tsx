import type { ComponentProps, ReactNode } from "react";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
} & ComponentProps<"input">;

export function Field({ label, name, error, hint, id, ...props }: FieldProps) {
  const fieldId = id ?? `f-${name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-xs font-medium uppercase tracking-[0.12em] text-mute">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-err` : undefined}
        {...props}
      />
      {hint && !error && <p className="text-xs text-mute">{hint}</p>}
      {error && (
        <p id={`${fieldId}-err`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type SelectProps = {
  label: string;
  name: string;
  error?: string;
  options: { value: string; label: string }[];
} & ComponentProps<"select">;

export function SelectField({ label, name, error, options, id, ...props }: SelectProps) {
  const fieldId = id ?? `f-${name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-xs font-medium uppercase tracking-[0.12em] text-mute">
        {label}
      </label>
      <select id={fieldId} name={name} className="field" aria-invalid={error ? true : undefined} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function TextArea({ label, name, error, id, ...props }: { label: string; name: string; error?: string } & ComponentProps<"textarea">) {
  const fieldId = id ?? `f-${name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-xs font-medium uppercase tracking-[0.12em] text-mute">
        {label}
      </label>
      <textarea id={fieldId} name={name} rows={4} className="field" aria-invalid={error ? true : undefined} {...props} />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
