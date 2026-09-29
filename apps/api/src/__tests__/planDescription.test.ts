import { describe, expect, it } from 'vitest';
import { buildTemplatePlanDescription } from '../services/planDescription.js';

describe('plan description template', () => {
  it('mentions includes and the manager account count', () => {
    expect(
      buildTemplatePlanDescription({
        name: 'Launch',
        highlights: ['Floor plans', 'Waitlist'],
        managerSeats: 2,
      }),
    ).toBe('Launch includes Floor plans, Waitlist, plus 2 manager accounts.');
  });

  it('uses a single manager account when the count is missing', () => {
    expect(buildTemplatePlanDescription({ name: 'Basic' })).toBe(
      'Basic is a Tablevera reservation package with 1 manager account.',
    );
  });
});
