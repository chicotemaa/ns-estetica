import test from 'node:test';
import assert from 'node:assert/strict';
import { cashMetrics, outstandingAppointments, businessDate } from '../lib/cash-metrics.ts';
const zone = 'America/Argentina/Buenos_Aires';
test('Excel date-only collections stay on the source day and month', () => {
  const payments = [{ amount: 26000, status: 'completed', collectionDate: '2026-08-31', processedAt: null, createdAt: '2026-09-09T20:00:00Z', commissionAmount: 13000 }];
  const august = cashMetrics(payments, [], [], '2026-08-31', zone);
  assert.equal(august.collections, 26000); assert.equal(august.monthlyCollections, 26000); assert.equal(august.undated, 0);
  assert.equal(cashMetrics(payments, [], [], '2026-09-09', zone).monthlyCollections, 0);
});
test('cash uses local collection date, counts expenses once and does not deduct accrued commission', () => {
  const payments = [
    { id: '1', amount: 100.10, status: 'completed', processedAt: '2026-10-01T01:30:00Z', method: 'transfer', commissionAmount: 50.05 },
    { id: '2', amount: 999, status: 'pending', processedAt: '2026-09-30T15:00:00Z' },
    { id: '3', amount: 50, status: 'completed', processedAt: null },
    { id: '4', amount: 30, status: 'completed', processedAt: '2026-10-01T04:00:00Z' },
  ];
  assert.equal(businessDate('2026-10-01T01:30:00Z', zone), '2026-09-30');
  const result = cashMetrics(payments, [{ expenseDate: '2026-09-30', amount: 20.10 }], [{ payoutDate: '2026-09-30', amount: 10 }], '2026-09-30', zone);
  assert.equal(result.collections, 100.10);
  assert.equal(result.monthlyCollections, 100.10);
  assert.equal(result.movementNet, 70);
  assert.equal(result.commissions, 50.05);
  assert.equal(result.undated, 1);
});
test('balances consider completed appointments and explicitly linked completed collections only', () => {
  const appointments = [ { id: '1', status: 'completed', price: 0.30 }, { id: '2', status: 'cancelled', price: 100 }, { id: '3', status: 'confirmed', price: 100 } ];
  const payments = [ { appointmentId: '1', amount: 0.1, status: 'completed' }, { appointmentId: '1', amount: 0.1, status: 'pending' }, { amount: 100, status: 'completed' } ];
  assert.deepEqual(outstandingAppointments(appointments, payments).map(a => a.balance), [0.2]);
});
