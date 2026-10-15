import { useEffect, useMemo, useState } from 'react';
import { Gavel, ScrollText } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { InfoButton } from '@/components/ui/InfoButton';
import { Sheet } from '@/components/ui/Sheet';
import { SatireTag } from '@/components/ui/Tags';
import { achievementStore } from '@/features/achievements/achievementStore';
import { useSettings } from '@/features/settings/settingsStore';
import { useNow } from '@/hooks/useNow';
import { reactivePower, type ReactiveKind } from '@/lib/engineeringMath';
import { pickMessage, rotationSlot } from '@/lib/humorEngine';
import { formatNumber } from '@/lib/formatters';
import { formatBerlinDate } from '@/lib/dateUtils';

export function ReactivePowerAgency() {
  const settings = useSettings();
  const now = useNow(60_000);
  const [pKw, setPKw] = useState(250);
  const [cosPhi, setCosPhi] = useState(0.92);
  const [kind, setKind] = useState<ReactiveKind>('inductive');
  const [fineOpen, setFineOpen] = useState(false);
  const result = useMemo(() => reactivePower({ pKw, cosPhi, kind }), [pKw, cosPhi, kind]);

  useEffect(() => {
    if (cosPhi < 0.7) achievementStore.track('reactive-criminal');
  }, [cosPhi]);

  const verdictCat = cosPhi >= 0.95 ? 'reactiveGood' : cosPhi >= 0.85 ? 'reactiveMedium' : cosPhi >= 0.7 ? 'reactiveBad' : 'reactiveTerrible';
  const verdict = pickMessage(verdictCat, { seed: `rp-${Math.round(cosPhi * 100)}-${rotationSlot(now, 60)}`, intensity: 'unhinged' });
  const tone = verdictCat === 'reactiveGood' ? 'text-green' : verdictCat === 'reactiveMedium' ? 'text-amber' : 'text-red';

  // triangle geometry: P horizontal, Q vertical (inductive up, capacitive down), S hypotenuse
  const W = 360;
  const H = 240;
  const scale = (W - 80) / Math.max(result.sKva, 1);
  const px = 40 + result.pKw * scale;
  const qy = result.qKvar * scale;
  const baseY = kind === 'inductive' ? H - 40 : 40;
  const tipY = baseY - qy; // inductive: qy positive → up; capacitive: qy negative → down
  const phiArcR = 42;
  const phiRad = (result.phiDeg * Math.PI) / 180;
  const arcEnd = { x: 40 + phiArcR * Math.cos(phiRad), y: baseY - (kind === 'inductive' ? 1 : -1) * phiArcR * Math.sin(phiRad) };

  return (
    <Card data-testid="reactive-agency">
      <CardHeader
        title="Reactive Power Enforcement Agency"
        subtitle="„Wir sehen deinen cos φ.“ – Blindleistungsrechner"
        right={
          <>
            <SatireTag>Satire-Bußgeld</SatireTag>
            <InfoButton title="Wirk-, Blind- und Scheinleistung">
              <p><strong>S = P / cos φ</strong> (Scheinleistung in kVA), <strong>|Q| = P · tan(arccos(cos φ))</strong> (Blindleistung in kvar), <strong>S² = P² + Q²</strong>.</p>
              <p>Induktive Verbraucher (Motoren, Transformatoren) beziehen Blindleistung (Q &gt; 0, Strom eilt nach), kapazitive liefern sie (Q &lt; 0). Blindleistung verrichtet im Mittel keine Arbeit, belastet aber Leitungen und Transformatoren durch den höheren Strom.</p>
              <p>Netzbetreiber verlangen von größeren Anschlüssen üblicherweise cos φ ≥ 0,9 – sonst wird Blindarbeit in Rechnung gestellt. Die „Bußgeldstelle“ hier ist frei erfunden.</p>
            </InfoButton>
          </>
        }
      />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-1">
          <label className="block text-sm">
            <span className="flex justify-between text-text-2">
              <span>Wirkleistung P</span>
              <span className="readout text-text">{formatNumber(pKw, 0)} kW</span>
            </span>
            <input type="range" min={1} max={2000} step={1} value={pKw} onChange={(e) => setPKw(Number(e.target.value))} style={{ ['--fill' as string]: `${(pKw / 2000) * 100}%` }} aria-label="Wirkleistung in kW" data-testid="rp-p" />
          </label>
          <label className="block text-sm">
            <span className="flex justify-between text-text-2">
              <span>Leistungsfaktor cos φ</span>
              <span className="readout text-text">{formatNumber(cosPhi, 2)}</span>
            </span>
            <input type="range" min={0.3} max={1} step={0.01} value={cosPhi} onChange={(e) => setCosPhi(Number(e.target.value))} style={{ ['--fill' as string]: `${((cosPhi - 0.3) / 0.7) * 100}%` }} aria-label="Leistungsfaktor cos phi" data-testid="rp-cos" />
          </label>
          <div className="flex gap-1" role="radiogroup" aria-label="Art der Blindleistung">
            <button type="button" role="radio" aria-checked={kind === 'inductive'} className="chip flex-1 justify-center" onClick={() => setKind('inductive')}>
              induktiv
            </button>
            <button type="button" role="radio" aria-checked={kind === 'capacitive'} className="chip flex-1 justify-center" onClick={() => setKind('capacitive')}>
              kapazitiv
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-border px-3 py-2">
              <dt className="text-[11px] text-text-3">S</dt>
              <dd className="readout text-text" data-testid="rp-s">{formatNumber(result.sKva, 1)} kVA</dd>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <dt className="text-[11px] text-text-3">Q</dt>
              <dd className="readout text-text" data-testid="rp-q">{formatNumber(result.qKvar, 1)} kvar</dd>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <dt className="text-[11px] text-text-3">φ</dt>
              <dd className="readout text-text">{formatNumber(result.phiDeg, 1)}°</dd>
            </div>
          </dl>
          <p className="text-[11px] text-text-3">Vorzeichen: induktiv (nacheilend) positiv, kapazitiv negativ – Verbraucherzählpfeilsystem.</p>
        </div>
        <div>
          <div className="overflow-hidden rounded-lg border border-border bg-bg-deep/40">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Leistungsdreieck aus P, Q und S">
              <line x1={40} y1={baseY} x2={px} y2={baseY} stroke="var(--c-green)" strokeWidth={3} />
              <line x1={px} y1={baseY} x2={px} y2={tipY} stroke="var(--c-amber)" strokeWidth={3} />
              <line x1={40} y1={baseY} x2={px} y2={tipY} stroke="var(--c-cyan)" strokeWidth={3} />
              {result.phiDeg > 2 && <path d={`M ${40 + phiArcR} ${baseY} A ${phiArcR} ${phiArcR} 0 0 ${kind === 'inductive' ? 0 : 1} ${arcEnd.x} ${arcEnd.y}`} fill="none" stroke="var(--c-text-3)" strokeWidth={1} />}
              <text x={(40 + px) / 2} y={baseY + (kind === 'inductive' ? 16 : -8)} textAnchor="middle" style={{ fill: 'var(--c-green)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                P = {formatNumber(result.pKw, 0)} kW
              </text>
              <text x={px + 6} y={(baseY + tipY) / 2 + 4} style={{ fill: 'var(--c-amber)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                Q = {formatNumber(result.qKvar, 0)} kvar
              </text>
              <text x={(40 + px) / 2 - 10} y={(baseY + tipY) / 2 + (kind === 'inductive' ? -8 : 16)} textAnchor="end" style={{ fill: 'var(--c-cyan)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                S = {formatNumber(result.sKva, 0)} kVA
              </text>
              <text x={40 + phiArcR + 6} y={baseY + (kind === 'inductive' ? -8 : 14)} style={{ fill: 'var(--c-text-2)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                φ = {formatNumber(result.phiDeg, 0)}°
              </text>
            </svg>
          </div>
          <div className={`mt-3 flex items-start gap-2 text-sm ${tone}`} data-testid="rp-verdict">
            <Gavel size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{settings.humor === 'professional' ? `Leistungsfaktor ${formatNumber(cosPhi, 2)} – ${cosPhi >= 0.9 ? 'im üblichen Toleranzbereich' : 'unterhalb der üblichen Anforderung von 0,9'}` : verdict?.title}</span>
          </div>
          {cosPhi < 0.9 && (
            <button type="button" className="btn btn-sm mt-3" onClick={() => setFineOpen(true)} data-testid="rp-fine">
              <ScrollText size={14} aria-hidden="true" /> Fiktiven Bußgeldbescheid anzeigen
            </button>
          )}
        </div>
      </div>
      <Sheet open={fineOpen} onClose={() => setFineOpen(false)} title="Bußgeldbescheid (fiktiv)" size="sm">
        <div className="space-y-2 text-sm" data-testid="rp-fine-sheet">
          <div className="flex items-center gap-2">
            <SatireTag>Witz – keine echten Entgelte</SatireTag>
          </div>
          <p className="font-display text-base font-semibold">Reactive Power Enforcement Agency · Aktenzeichen RPEA-{Math.round(cosPhi * 100)}-{Math.round(pKw)}</p>
          <p className="text-text-2">
            Sehr geehrte Anschlussnehmerin, sehr geehrter Anschlussnehmer, am {formatBerlinDate(now)} wurde an Ihrem Anschluss ein Leistungsfaktor von <strong className="text-text">cos φ = {formatNumber(cosPhi, 2)}</strong> ({kind === 'inductive' ? 'induktiv' : 'kapazitiv'}) festgestellt. Bei {formatNumber(pKw, 0)} kW Wirkleistung transportieren Sie {formatNumber(Math.abs(result.qKvar), 0)} kvar Blindleistung – also hauptsächlich Beziehungen zwischen Spannung und Strom.
          </p>
          <p className="text-text-2">Maßnahme: Bitte eine Kompensationsanlage in Betracht ziehen und Ihrem Transformator ein ernstes Gespräch anbieten. Ein Bußgeld wird nicht erhoben, weil diese Behörde nicht existiert.</p>
          <p className="text-[11px] text-text-3">Dieser Bescheid ist ein Witz. Reale Blindarbeitsentgelte regeln Netzbetreiber nach ihren Netzanschlussbedingungen.</p>
        </div>
      </Sheet>
    </Card>
  );
}
