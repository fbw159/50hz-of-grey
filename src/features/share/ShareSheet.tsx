import { useMemo, useState } from 'react';
import { Copy, Download, Share2, Image as ImageIcon } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { SatireTag, DemoTag } from '@/components/ui/Tags';
import { useGridData } from '@/hooks/useGridData';
import { showSnack } from '@/hooks/useSnackbar';
import { buildReportCard, renderReportPng, reportToText } from './reportCard';
import { appUrl, copyText } from '@/lib/clipboard';

interface Props {
  open: boolean;
  onClose: () => void;
  panicValue: number | null;
}


export function ShareSheet({ open, onClose, panicValue }: Props) {
  const data = useGridData();
  const now = Date.now();
  const card = useMemo(() => buildReportCard(data.datasets, now, panicValue), [data.datasets, now, panicValue]);
  const [busy, setBusy] = useState(false);
  const url = appUrl();
  const text = reportToText(card, url);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const share = async () => {
    if (!canShare) {
      const ok = await copyText(`${text}`);
      showSnack(ok ? 'Report kopiert.' : 'Kopieren nicht möglich.', { tone: ok ? 'success' : 'warning' });
      return;
    }
    try {
      await navigator.share({ title: card.title, text, url });
    } catch {
      /* user cancelled */
    }
  };

  const copyLink = async () => {
    const ok = await copyText(url);
    showSnack(ok ? 'Link kopiert.' : 'Kopieren nicht möglich – bitte Adresszeile verwenden.', { tone: ok ? 'success' : 'warning' });
  };

  const exportPng = async () => {
    setBusy(true);
    try {
      const blob = await renderReportPng(card, url);
      if (!blob) throw new Error('Canvas nicht verfügbar');
      const file = new File([blob], 'daily-grid-report.png', { type: 'image/png' });
      if (canShare && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: card.title, text: card.quote });
          return;
        } catch {
          /* cancelled → fall through to download */
        }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'daily-grid-report.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      showSnack('PNG-Report erstellt.', { tone: 'success' });
    } catch (err) {
      showSnack(`PNG-Export fehlgeschlagen: ${(err as Error).message}`, { tone: 'warning' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Daily Grid Report teilen" size="sm">
      <div className="card card-elevated overflow-hidden p-0" data-testid="report-card">
        <div className="border-b border-border px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">⚡ 50 Hz of Grey</div>
          <div className="font-display text-lg font-bold">Daily Grid Report</div>
          <div className="text-xs text-text-3">{card.dateLine}</div>
          {card.demo && <DemoTag className="mt-1" />}
        </div>
        <ul className="divide-y divide-border">
          {card.lines.map((l) => (
            <li key={l.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <div className="text-xs text-text-2">{l.label}</div>
                {l.note && <div className="text-[11px] text-text-3">{l.note}</div>}
              </div>
              <div className="flex items-center gap-2">
                {l.satire && <SatireTag />}
                <span className={`readout text-base font-semibold ${l.satire ? 'text-purple' : 'text-text'}`}>{l.value}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="px-4 py-3 font-display text-sm italic text-text">„{card.quote}“</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-primary col-span-2" onClick={share} data-testid="share-native">
          <Share2 size={16} aria-hidden="true" />
          {canShare ? 'Teilen' : 'Report als Text kopieren'}
        </button>
        <button type="button" className="btn" onClick={copyLink}>
          <Copy size={16} aria-hidden="true" />
          Link kopieren
        </button>
        <button type="button" className="btn" onClick={exportPng} disabled={busy}>
          {busy ? <Download size={16} className="animate-pulse" aria-hidden="true" /> : <ImageIcon size={16} aria-hidden="true" />}
          PNG-Report
        </button>
      </div>
      <p className="mt-3 text-[11px] text-text-3">Satirewerte sind als solche gekennzeichnet. Datenquelle: Energy-Charts (Fraunhofer ISE), CC BY 4.0.</p>
    </Sheet>
  );
}
