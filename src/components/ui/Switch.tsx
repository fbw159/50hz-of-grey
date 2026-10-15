import type { ReactNode } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  id?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, id, disabled }: SwitchProps) {
  return (
    <label className={`flex min-h-[52px] cursor-pointer items-center justify-between gap-4 py-2 ${disabled ? 'opacity-50' : ''}`} htmlFor={id}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text">{label}</span>
        {description && <span className="block text-xs text-text-2">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className="switch"
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
    </label>
  );
}
