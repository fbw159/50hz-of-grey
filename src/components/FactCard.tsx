import { useState } from 'react';
import { FACTS } from '@/content/texts';
import { hashString } from '@/lib/timeseries';

export function FactCard({ dayKey }: { dayKey: string }) {
  // start with the "fact of the day", then step through all of them
  const [index, setIndex] = useState(() => hashString(dayKey) % FACTS.length);
  return (
    <section className="panel p-4" aria-labelledby="fact-title" data-testid="fact-card">
      <h2 id="fact-title" className="section-title">
        Wusstest du?
      </h2>
      <p className="mt-2 min-h-[4.4rem] text-[1.05rem]" aria-live="polite" data-testid="fact-text">
        {FACTS[index]}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" className="btn" onClick={() => setIndex((i) => (i + 1) % FACTS.length)} data-testid="fact-next">
          Noch ein Fakt
        </button>
        <span className="fine">
          {index + 1} von {FACTS.length}
        </span>
      </div>
    </section>
  );
}
