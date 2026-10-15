import { Activity, Coins, Factory, FlaskConical, Menu } from 'lucide-react';
import type { RouteId } from '@/hooks/useHashRoute';

export interface NavItem {
  id: RouteId;
  label: string;
  icon: typeof Activity;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'control', label: 'Leitwarte', icon: Activity },
  { id: 'market', label: 'Strombörse', icon: Coins },
  { id: 'generation', label: 'Erzeugung', icon: Factory },
  { id: 'lab', label: 'Labor', icon: FlaskConical },
  { id: 'more', label: 'Mehr', icon: Menu },
];

