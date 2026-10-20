import { describe, expect, it } from 'vitest';
import { GAME_DURATION_S, adjust, isBetter, newGame, rankFor, step, type GameState } from './game';
import { seededRandom } from '@/lib/timeseries';

function play(seed: string, player: (g: GameState) => GameState): GameState {
  const rng = seededRandom(seed);
  let g = newGame(rng);
  for (let i = 0; i < 2000 && g.status === 'running'; i++) {
    g = step(player(g), 1 / 30, rng);
  }
  return g;
}

describe('game', () => {
  it('starts calm at 50 Hz', () => {
    const g = newGame(seededRandom('x'));
    expect(g.f).toBe(50);
    expect(g.status).toBe('running');
  });

  it('is lost when nobody plays', () => {
    const results = ['a', 'b', 'c', 'd', 'e'].map((s) => play(s, (g) => g));
    expect(results.every((g) => g.status === 'low' || g.status === 'high')).toBe(true);
  });

  it('can be won by a quick player who balances the grid', () => {
    // a perfect player removes the imbalance one tap at a time
    const balancer = (g: GameState) => (g.imbalanceGw >= 1 ? adjust(g, 1) : g.imbalanceGw <= -1 ? adjust(g, -1) : g);
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const g = play(seed, balancer);
      expect(g.status).toBe('won');
      expect(g.t).toBe(GAME_DURATION_S);
      expect(rankFor(g).title).toBeTruthy();
    }
  });

  it('ignores input after the game ended and clamps big time steps', () => {
    const rng = seededRandom('z');
    const g = { ...newGame(rng), status: 'low' as const };
    expect(adjust(g, 1)).toBe(g);
    expect(step(g, 1, rng)).toBe(g);
    const s = step(newGame(rng), 5, rng);
    expect(s.t).toBeCloseTo(0.1);
  });

  it('ranks wins above losses for the personal best', () => {
    expect(isBetter({ won: true, seconds: 45 }, { won: false, seconds: 44 })).toBe(true);
    expect(isBetter({ won: false, seconds: 30 }, { won: true, seconds: 45 })).toBe(false);
    expect(isBetter({ won: false, seconds: 30 }, { won: false, seconds: 20 })).toBe(true);
    expect(isBetter({ won: false, seconds: 3 }, null)).toBe(true);
  });
});
