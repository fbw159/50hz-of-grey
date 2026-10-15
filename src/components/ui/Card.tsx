import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
  glow?: boolean;
  corners?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PAD = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5 sm:p-6' } as const;

export function Card({ children, elevated, glow, corners = true, padding = 'md', className = '', ...rest }: CardProps) {
  return (
    <div className={`card ${elevated ? 'card-elevated' : ''} ${glow ? 'card-glow' : ''} ${corners ? 'corners' : ''} ${PAD[padding]} ${className}`} {...rest}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, right, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold leading-tight text-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-text-2">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

export function SectionTitle({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold tracking-tight text-text sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-text-2">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
