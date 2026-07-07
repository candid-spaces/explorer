import { describe, expect, it } from 'vitest';
import { CENTIPACES_PER_PACE, METERS_PER_CENTIPACE, METERS_PER_PACE, UNIT_SCALE_DESCRIPTION } from './units';

describe('project unit scale', () => {
  it('defines paces as 10 cm project units and centipaces as millimetres', () => {
    expect(CENTIPACES_PER_PACE).toBe(100);
    expect(METERS_PER_PACE).toBe(0.1);
    expect(METERS_PER_CENTIPACE).toBe(0.001);
    expect(UNIT_SCALE_DESCRIPTION).toBe('1 pace = 10 cm; 1c = 1 mm');
  });
});
