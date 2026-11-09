import type { LengthUnit } from '@/types/robot';

/** SI ↔ display conversions. Mirrors backend/app/core/units.py. */

const DEG_PER_RAD = 180 / Math.PI;
const RAD_PER_DEG = Math.PI / 180;

export function degToRad(degrees: number): number {
  return degrees * RAD_PER_DEG;
}

export function radToDeg(radians: number): number {
  return radians * DEG_PER_RAD;
}

const METRES_PER_UNIT: Record<LengthUnit, number> = { m: 1, cm: 0.01, mm: 0.001 };

/** Decimal places that keep ~0.1 mm resolution in every unit. */
export const LENGTH_DECIMALS: Record<LengthUnit, number> = { m: 4, cm: 2, mm: 1 };

export const LENGTH_UNITS: readonly LengthUnit[] = ['m', 'cm', 'mm'];

export function lengthToSi(value: number, unit: LengthUnit): number {
  return value * METRES_PER_UNIT[unit];
}

export function lengthFromSi(metres: number, unit: LengthUnit): number {
  return metres / METRES_PER_UNIT[unit];
}

/** Format a value without "-0" and with a fixed number of decimals. */
export function formatNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  return /^-0(\.0+)?$/.test(fixed) ? fixed.slice(1) : fixed;
}

export function formatLength(metres: number, unit: LengthUnit): string {
  return `${formatNumber(lengthFromSi(metres, unit), LENGTH_DECIMALS[unit])} ${unit}`;
}

export function formatAngleDeg(radians: number, decimals = 2): string {
  return `${formatNumber(radToDeg(radians), decimals)}°`;
}
