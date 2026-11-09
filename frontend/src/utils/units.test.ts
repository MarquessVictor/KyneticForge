import { describe, expect, it } from 'vitest';
import {
  degToRad,
  formatAngleDeg,
  formatLength,
  formatNumber,
  lengthFromSi,
  lengthToSi,
  radToDeg,
} from './units';

describe('angle conversion', () => {
  it.each([
    [0, 0],
    [180, Math.PI],
    [-90, -Math.PI / 2],
    [360, 2 * Math.PI],
    [30, Math.PI / 6],
  ])('%f° = %f rad', (deg, rad) => {
    expect(degToRad(deg)).toBeCloseTo(rad, 15);
    expect(radToDeg(rad)).toBeCloseTo(deg, 12);
  });

  it('round-trips arbitrary values', () => {
    for (const deg of [-179.9, -45.123, 0.001, 12.5, 359.99]) {
      expect(radToDeg(degToRad(deg))).toBeCloseTo(deg, 12);
    }
  });

  it('matches the backend formula exactly (deg · π/180)', () => {
    expect(degToRad(30)).toBe(30 * (Math.PI / 180));
  });
});

describe('length conversion', () => {
  it.each([
    [1, 'm', 1],
    [250, 'cm', 2.5],
    [300, 'mm', 0.3],
  ] as const)('%f %s = %f m', (value, unit, metres) => {
    expect(lengthToSi(value, unit)).toBeCloseTo(metres, 15);
    expect(lengthFromSi(metres, unit)).toBeCloseTo(value, 12);
  });
});

describe('formatting', () => {
  it('never prints negative zero', () => {
    expect(formatNumber(-0.00001, 3)).toBe('0.000');
    expect(formatNumber(-0, 2)).toBe('0.00');
    expect(formatNumber(-1.5, 1)).toBe('-1.5');
  });

  it('formats lengths in the display unit', () => {
    expect(formatLength(0.7, 'm')).toBe('0.7000 m');
    expect(formatLength(0.7, 'cm')).toBe('70.00 cm');
    expect(formatLength(0.7, 'mm')).toBe('700.0 mm');
  });

  it('formats angles in degrees', () => {
    expect(formatAngleDeg(Math.PI / 2)).toBe('90.00°');
  });
});
