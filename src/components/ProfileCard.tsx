import { useState } from 'react';
import { SocketFace } from './SocketFace';
import { PROFILE_CHIPS, PROFILE_REPLIES, SOCKET_NAME } from '@/content/texts';
import { showToast } from '@/hooks/useToast';

/** Mr. Grey's dating profile. "Steckbrief" is a pun: Stecker + Brief. */
export function ProfileCard() {
  const [swipes, setSwipes] = useState(0);
  const react = (kind: 'nope' | 'like') => {
    const list = PROFILE_REPLIES[kind];
    showToast(list[swipes % list.length], 3400);
    setSwipes((n) => n + 1);
  };
  return (
    <section id="steckbrief" className="panel scroll-mt-4 p-4" aria-labelledby="profile-title" data-testid="profile-card">
      <h2 id="profile-title" className="section-title">
        Steckbrief
      </h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex items-end gap-3 bg-gradient-to-b from-[#f1efe8] to-white px-3 pt-3">
          <SocketFace mood="chill" tie size={92} />
          <div className="pb-3">
            <p className="font-cond text-[1.7rem] font-extrabold leading-none">
              {SOCKET_NAME}, 230
            </p>
            <p className="mt-1 text-[0.875rem] text-ink-2">
              <span aria-hidden="true">📍 </span>Wohnt in deiner Wand
            </p>
            <p className="text-[0.875rem] text-ink-2">
              <span aria-hidden="true">✅ </span>Verifiziert geerdet
            </p>
          </div>
        </div>
        <div className="px-3 pb-3 pt-2">
          <p className="text-[1rem] leading-snug">Single, geerdet, sucht eine feste Verbindung. Kein Mehrfachstecker-Drama, bitte.</p>
          <ul className="mt-3 flex flex-wrap gap-1.5" data-testid="profile-chips">
            {PROFILE_CHIPS.map((c) => (
              <li key={c} className="chip bg-panel text-[0.8125rem] font-semibold text-ink">
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className="btn min-h-12" onClick={() => react('nope')} data-testid="profile-nope">
              <span aria-hidden="true">✕</span> Weiter
            </button>
            <button type="button" className="btn btn-yellow min-h-12" onClick={() => react('like')} data-testid="profile-like">
              <span aria-hidden="true">♥</span> Einstecken
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
