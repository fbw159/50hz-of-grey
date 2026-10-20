import { PROFILE, SOCKET_NAME } from '@/content/texts';

/** The socket's dating profile. "Steckbrief" is a pun: Stecker + Brief. */
export function ProfileCard() {
  return (
    <section id="steckbrief" className="panel scroll-mt-4 p-4" aria-labelledby="profile-title" data-testid="profile-card">
      <h2 id="profile-title" className="section-title">
        Steckbrief: {SOCKET_NAME}
      </h2>
      <p className="mt-1 text-ink-2">Single, geerdet, sucht eine feste Verbindung.</p>
      <dl className="mt-3 divide-y divide-line/70 text-[0.95rem]">
        {PROFILE.map((row) => (
          <div key={row.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-2">
            <dt className="font-semibold text-ink-2">{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
