import { useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useGridData, refreshGridData } from '@/hooks/useGridData';
import { useNow } from '@/hooks/useNow';
import { summarizeOrigins } from '@/services/dataSource';
import { formatAge, formatBerlinDateTime } from '@/lib/dateUtils';
import { OriginTag } from '@/components/ui/Tags';
import { DATASET_KEYS } from '@/types/data';
import { showSnack } from '@/hooks/useSnackbar';

const DATASET_LABEL: Record<string, string> = {
  price: 'Day-Ahead-Preise',
  publicPower: 'Erzeugung',
  frequency: 'Netzfrequenz',
  signal: 'Stromampel',
  forecastSolar: 'PV-Prognose',
  forecastWindOnshore: 'Wind-Onshore-Prognose',
  forecastWindOffshore: 'Wind-Offshore-Prognose',
  forecastLoad: 'Lastprognose',
  installedPower: 'Installierte Leistung',
};

/** One-line data provenance (sidebar / header). */
export function DataStatusLine({ compact = false }: { compact?: boolean }) {
  const data = useGridData();
  const now = useNow(10_000);
  const { primary } = summarizeOrigins(data.datasets);
  const newest = DATASET_KEYS.reduce<number>((m, k) => Math.max(m, data.datasets[k]?.fetchedAt ?? 0), 0);
  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-[11px]' : 'text-xs'} text-text-3`}>
      {primary !== 'none' ? <OriginTag origin={primary} /> : <span className="font-mono text-[10px] uppercase tracking-[0.12em]">Keine Daten</span>}
      {data.offline && <WifiOff size={12} className="text-amber" aria-label="Offline" />}
      {newest > 0 && <span className="truncate">Update {formatAge(now - newest)}</span>}
      {data.refreshing && <RefreshCw size={12} className="animate-spin text-text-3" aria-label="Aktualisiert" />}
    </div>
  );
}

/** Full status card for the "Mehr" page and error states. */
export function DataStatusPanel() {
  const data = useGridData();
  const now = useNow(5_000);
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    setBusy(true);
    try {
      await refreshGridData();
      showSnack('Daten neu geladen.', { tone: 'success' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <DataStatusLine />
        <button type="button" className="btn btn-sm ml-auto" onClick={retry} disabled={busy}>
          <RefreshCw size={14} className={busy || data.refreshing ? 'animate-spin' : ''} aria-hidden="true" />
          Erneut versuchen
        </button>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {DATASET_KEYS.map((key) => {
          const ds = data.datasets[key];
          const err = data.errors.find((e) => e.key === key);
          return (
            <li key={key} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-text">{DATASET_LABEL[key]}</div>
                <div className="truncate text-xs text-text-3">
                  {ds ? `Daten bis ${ds.availableUntil ? formatBerlinDateTime(ds.availableUntil) : '–'} · abgerufen ${formatAge(now - ds.fetchedAt)}` : 'nicht geladen'}
                  {err && !err.expected && <span className="text-amber"> · {err.message}</span>}
                  {err && err.expected && <span> · noch nicht veröffentlicht</span>}
                </div>
              </div>
              {ds ? <OriginTag origin={ds.origin} /> : <span className="font-mono text-[10px] uppercase text-text-3">–</span>}
            </li>
          );
        })}
      </ul>
      {data.snapshotError && <p className="text-xs text-amber">Snapshot: {data.snapshotError}</p>}
      {data.liveConfigured ? (
        <p className="text-xs text-text-3">Direkter API-Zugriff ist konfiguriert; Snapshot dient als Fallback.</p>
      ) : (
        <p className="text-xs text-text-3">Die Energy-Charts-API erlaubt keine direkten Browser-Zugriffe von fremden Domains (CORS). Die Daten kommen aus dem Snapshot, den GitHub Actions regelmäßig aktualisiert.</p>
      )}
    </div>
  );
}
