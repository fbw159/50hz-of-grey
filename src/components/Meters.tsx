import type { GridView } from '@/logic/view';
import { eurPerMwhToCtPerKwh, formatNumber } from '@/lib/formatters';

/** 7-segment number with unlit "8"s behind it. Uses "." as on real meters. */
export function Seg({ text, className = '' }: { text: string; className?: string }) {
  const ghost = text.replace(/[0-9-]/g, '8');
  return (
    <span className={`seg ${className}`} data-ghost={ghost} aria-hidden="true">
      {text}
    </span>
  );
}

export type Led = 'ok' | 'warn' | 'alarm' | 'off';
const LED_COLOR: Record<Led, string> = { ok: '#3f9b55', warn: '#f2a900', alarm: '#c8392b', off: '#9aa09b' };

function segPrice(ct: number): string {
  return Math.abs(ct) >= 100 ? Math.round(ct).toString() : ct.toFixed(1);
}

interface MeterProps {
  href: string;
  label: string;
  unit: string;
  seg: string;
  spoken: string;
  led: Led;
  testId: string;
  wide?: boolean;
}

function Meter({ href, label, unit, seg, spoken, led, testId, wide = false }: MeterProps) {
  return (
    <a
      href={href}
      className={`panel flex min-w-0 flex-col gap-1.5 !rounded-2xl p-2 no-underline ${wide ? 'col-span-2' : ''}`}
      aria-label={`${label}: ${spoken}`}
      data-testid={testId}
    >
      <span className="lcd flex items-baseline justify-end px-3 py-2.5">
        <Seg text={seg} className={wide ? 'text-[2.3rem] leading-none' : 'text-[1.6rem] leading-none'} />
      </span>
      <span className="flex items-center gap-1.5 px-0.5">
        <span className="led shrink-0" style={{ color: LED_COLOR[led] }} />
        <span className="min-w-0 truncate text-[0.8125rem] font-semibold leading-tight">{label}</span>
        <span className="ml-auto text-[0.75rem] text-ink-2">{unit}</span>
      </span>
    </a>
  );
}

export function Meters({ view }: { view: GridView }) {
  const f = view.frequency;
  const p = view.price?.current?.value ?? null;
  const share = view.generation?.renewableShareOfLoad ?? null;

  const fLed: Led = !f || f.stale ? 'off' : Math.abs(f.deviationMilliHz) < 50 ? 'ok' : Math.abs(f.deviationMilliHz) < 100 ? 'warn' : 'alarm';
  const pLed: Led = p === null ? 'off' : p < 150 ? 'ok' : p < 250 ? 'warn' : 'alarm';
  const sLed: Led = share === null ? 'off' : share >= 60 ? 'ok' : share >= 35 ? 'warn' : 'alarm';
  const ct = p === null ? null : eurPerMwhToCtPerKwh(p);

  return (
    <div className="grid grid-cols-2 gap-2">
      <Meter
        wide
        href="#ekg"
        label="Netzfrequenz"
        unit="Hz"
        seg={f ? f.value.toFixed(3) : '--.---'}
        spoken={f ? `${formatNumber(f.value, 3)} Hertz` : 'keine Daten'}
        led={fLed}
        testId="meter-frequency"
      />
      <Meter
        href="#preis"
        label="Börsenstrom"
        unit="ct/kWh"
        seg={ct === null ? '--.-' : segPrice(ct)}
        spoken={ct === null ? 'keine Daten' : `${formatNumber(ct, 1)} Cent pro Kilowattstunde`}
        led={pLed}
        testId="meter-price"
      />
      <Meter
        href="#mix"
        label="Öko-Anteil"
        unit="%"
        seg={share === null ? '--' : Math.round(share).toString()}
        spoken={share === null ? 'keine Daten' : `${Math.round(share)} Prozent erneuerbar`}
        led={sLed}
        testId="meter-share"
      />
    </div>
  );
}
