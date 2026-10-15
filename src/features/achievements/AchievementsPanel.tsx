import { Zap, TrendingDown, Gavel, Briefcase, AlertTriangle, Table, Activity, Presentation, OctagonAlert, MessageSquareQuote, PartyPopper, Terminal, Users, Lock } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { ACHIEVEMENTS, type AchievementDef } from '@/data/achievements';
import { achievementProgress, useAchievements } from './achievementStore';
import { formatBerlinDate } from '@/lib/dateUtils';

const ICONS: Record<AchievementDef['icon'], typeof Zap> = { Zap, TrendingDown, Gavel, Briefcase, AlertTriangle, Table, Activity, Presentation, OctagonAlert, MessageSquareQuote, PartyPopper, Terminal, Users };

export function AchievementsPanel() {
  const state = useAchievements();
  const unlockedCount = ACHIEVEMENTS.filter((a) => state.unlocked[a.id]).length;
  return (
    <Card data-testid="achievements-panel">
      <CardHeader title="Achievements" subtitle={`${unlockedCount} von ${ACHIEVEMENTS.length} freigeschaltet · lokal gespeichert`} />
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const p = achievementProgress(state, a);
          const Icon = ICONS[a.icon];
          const unlocked = p.unlockedAt !== null;
          return (
            <li key={a.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${unlocked ? 'border-amber/50 bg-amber/8' : 'border-border opacity-80'}`} data-testid={`achievement-${a.id}`}>
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${unlocked ? 'bg-amber/20 text-amber' : 'bg-elevated text-text-3'}`}>{unlocked ? <Icon size={16} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text">{a.title}</div>
                <div className="text-xs text-text-2">{a.description}</div>
                {unlocked ? (
                  <div className="mt-1 font-mono text-[10px] text-amber">Freigeschaltet am {formatBerlinDate(p.unlockedAt as number)}</div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                      <span className="block h-full rounded-full bg-cyan" style={{ width: `${(p.value / p.threshold) * 100}%` }} />
                    </span>
                    <span className="font-mono text-[10px] text-text-3">
                      {p.value}/{p.threshold}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
