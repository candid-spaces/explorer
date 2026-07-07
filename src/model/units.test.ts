import { describe, expect, it } from 'vitest';
import { CENTIUNITS_PER_UNIT, METERS_PER_CENTIUNIT, METERS_PER_UNIT, UNIT_SCALE_DESCRIPTION } from './units';

describe('project unit scale', () => {
  it('defines units as 10 cm project units and centiunits as millimetres', () => {
    expect(CENTIUNITS_PER_UNIT).toBe(100);
    expect(METERS_PER_UNIT).toBe(0.1);
    expect(METERS_PER_CENTIUNIT).toBe(0.001);
    expect(UNIT_SCALE_DESCRIPTION).toBe('1 unit = 10 cm; 1c = 1 mm');
  });
});
