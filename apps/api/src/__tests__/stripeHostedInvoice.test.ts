import { describe, expect, it } from 'vitest';
import { buildHostedStripeInvoiceContent } from '../services/stripe.js';

describe('buildHostedStripeInvoiceContent', () => {
  it('puts invoice number, period, due date, and amount on the Stripe invoice', () => {
    const content = buildHostedStripeInvoiceContent({
      localInvoiceId: '6ae095b62695eb9e67d7c77e',
      number: 'INV-202610-0082',
      restaurantId: '6ae095ac626abc7b1e5a0681',
      restaurantName: 'Apricot Choynona 89',
      billingPeriod: '2026-10',
      periodStart: new Date('2026-10-01T00:00:00.000Z'),
      periodEnd: new Date('2026-10-31T23:59:59.999Z'),
      dueDate: new Date('2026-11-01T00:00:00.000Z'),
      currency: 'usd',
      customerId: 'cus_test',
      lines: [{ description: 'Core plan - 2026-10', amountCents: 9900 }],
    });

    expect(content.number).toBe('INV-202610-0082');
    expect(content.description).toContain('INV-202610-0082');
    expect(content.description).toContain('Apricot Choynona 89');
    expect(content.description).toContain('Oct 1, 2026');
    expect(content.description).toContain('Oct 31, 2026');
    expect(content.description).toContain('Nov 1, 2026');
    expect(content.customFields).toEqual(
      expect.arrayContaining([
        { name: 'Invoice number', value: 'INV-202610-0082' },
        { name: 'Billing period', value: 'Oct 1, 2026 – Oct 31, 2026' },
        { name: 'Due date', value: 'Nov 1, 2026' },
        { name: 'Restaurant', value: 'Apricot Choynona 89' },
      ]),
    );
    expect(content.metadata).toMatchObject({
      source: 'tablevera_local',
      invoiceNumber: 'INV-202610-0082',
      billingPeriod: '2026-10',
    });
    expect(content.lines).toEqual([
      {
        description: 'Core plan - 2026-10',
        amount: 9900,
        period: {
          start: Math.floor(Date.parse('2026-10-01T00:00:00.000Z') / 1000),
          end: Math.floor(Date.parse('2026-10-31T23:59:59.999Z') / 1000),
        },
      },
    ]);
    expect(content.dueDateUnix).toBeGreaterThanOrEqual(
      Math.floor(Date.parse('2026-11-01T00:00:00.000Z') / 1000),
    );
  });

  it('drops zero-amount lines so Stripe is not sent an empty bill', () => {
    const content = buildHostedStripeInvoiceContent({
      localInvoiceId: 'id',
      number: 'INV-1',
      restaurantId: 'rid',
      billingPeriod: '2026-10',
      periodStart: new Date('2026-10-01T00:00:00.000Z'),
      periodEnd: new Date('2026-10-31T00:00:00.000Z'),
      dueDate: new Date('2026-11-01T00:00:00.000Z'),
      currency: 'usd',
      customerId: 'cus_test',
      lines: [
        { description: 'Trial', amountCents: 0 },
        { description: 'Cover fee', amountCents: 200 },
      ],
    });
    expect(content.lines).toEqual([
      expect.objectContaining({ description: 'Cover fee', amount: 200 }),
    ]);
  });
});
