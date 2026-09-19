import { describe, expect, it } from 'vitest';
import {
  AR_MISSIONS,
  BONUS_MISSIONS,
  isCorrect,
  requiredTime,
  simulatedTravelRatio,
  speedInMetersPerSecond,
} from '../src/features/ar-lab/missions';

describe('AR Lab mission model', () => {
  it('keeps the five MVP missions deterministic', () => {
    expect(AR_MISSIONS).toHaveLength(5);
    expect(AR_MISSIONS.map((m) => m.id)).toEqual([
      'landing-01',
      'landing-02',
      'landing-03',
      'landing-04',
      'landing-05',
    ]);
  });

  it('computes flight time and failed-travel ratio correctly', () => {
    expect(requiredTime(AR_MISSIONS[0])).toBe(6);
    expect(requiredTime(AR_MISSIONS[1])).toBe(6);
    expect(simulatedTravelRatio(AR_MISSIONS[1])).toBeCloseTo(5 / 6);
  });

  it('converts km/h before evaluating the mission', () => {
    expect(speedInMetersPerSecond(AR_MISSIONS[4])).toBe(20);
    expect(requiredTime(AR_MISSIONS[4])).toBe(5);
  });

  it('uses explicit authored answers rather than heuristic grading', () => {
    expect(isCorrect(AR_MISSIONS[0], 'yes')).toBe(true);
    expect(isCorrect(AR_MISSIONS[1], 'yes')).toBe(false);
    expect(isCorrect(AR_MISSIONS[2], '35')).toBe(true);
    expect(BONUS_MISSIONS).toHaveLength(3);
  });
});
