export type AchievementEvent =
  | 'app-open'
  | 'negative-price-seen'
  | 'reactive-criminal'
  | 'management-on'
  | 'disturbance'
  | 'excel'
  | 'frequency-watched'
  | 'crisis-meeting'
  | 'do-not-press'
  | 'excuse'
  | 'party'
  | 'retro'
  | 'konami'
  | 'meeting-participants';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** Counter key and threshold that unlock it. */
  event: AchievementEvent;
  threshold: number;
  /** Lucide icon name (resolved in the UI). */
  icon: 'Zap' | 'TrendingDown' | 'Gavel' | 'Briefcase' | 'AlertTriangle' | 'Table' | 'Activity' | 'Presentation' | 'OctagonAlert' | 'MessageSquareQuote' | 'PartyPopper' | 'Terminal' | 'Users';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'grid-survived', title: 'The Grid Survived You', description: 'Dashboard zehnmal geöffnet.', event: 'app-open', threshold: 10, icon: 'Zap' },
  { id: 'negative-energy', title: 'Negative Energy Enthusiast', description: 'Einen tatsächlich negativen Börsenpreis im Dashboard gesehen.', event: 'negative-price-seen', threshold: 1, icon: 'TrendingDown' },
  { id: 'reactive-criminal', title: 'Reactive Power Criminal', description: 'Im Blindleistungsrechner cos φ unter 0,7 eingestellt.', event: 'reactive-criminal', threshold: 1, icon: 'Gavel' },
  { id: 'management-material', title: 'Management Material', description: 'Management-Modus aktiviert.', event: 'management-on', threshold: 1, icon: 'Briefcase' },
  { id: 'questionable-operator', title: 'Grid Operator of Questionable Competence', description: 'In der Simulation fünf Störungen ausgelöst.', event: 'disturbance', threshold: 5, icon: 'AlertTriangle' },
  { id: 'excel-engineer', title: 'Certified Excel Engineer', description: 'Dreimal auf „Problem mit Excel lösen“ geklickt.', event: 'excel', threshold: 3, icon: 'Table' },
  { id: 'perfectionist', title: '50 Hz Perfectionist', description: 'Frequenzdiagramm länger betrachtet als gesellschaftlich angemessen.', event: 'frequency-watched', threshold: 1, icon: 'Activity' },
  { id: 'powerpoint-pro', title: 'PowerPoint Professional', description: 'Ein Krisenmeeting einberufen.', event: 'crisis-meeting', threshold: 1, icon: 'Presentation' },
  { id: 'button-pusher', title: 'Persistent Button Pusher', description: 'Fünfmal DO NOT PRESS gedrückt. Trotzdem.', event: 'do-not-press', threshold: 5, icon: 'OctagonAlert' },
  { id: 'excuse-master', title: 'Senior Excuse Engineer', description: 'Zehn Ausreden generiert.', event: 'excuse', threshold: 10, icon: 'MessageSquareQuote' },
  { id: 'party-animal', title: 'Negative Price Party Animal', description: 'Die Negative-Price-Party gestartet.', event: 'party', threshold: 1, icon: 'PartyPopper' },
  { id: 'retro-operator', title: 'Retro SCADA Operator', description: 'Den Retro-SCADA-Modus aktiviert.', event: 'retro', threshold: 1, icon: 'Terminal' },
  { id: 'meeting-maximalist', title: 'Meeting Maximalist', description: 'Dem Meeting 20 Teilnehmer hinzugefügt.', event: 'meeting-participants', threshold: 20, icon: 'Users' },
];
