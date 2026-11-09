import { describe, expect, it } from 'vitest';
import { REFERENCE } from '@/test/fixtures';
import { createDefaultRobot } from './defaultRobot';

describe('createDefaultRobot', () => {
  it('is identical to the backend default preset', () => {
    expect(createDefaultRobot()).toEqual(REFERENCE.defaultRobot);
  });

  it('returns independent copies', () => {
    const a = createDefaultRobot();
    a.joints[0].angle = 1;
    expect(createDefaultRobot().joints[0].angle).not.toBe(1);
  });
});
