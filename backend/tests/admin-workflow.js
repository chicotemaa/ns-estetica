'use strict';
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const { resolve } = require('node:path');
const panel = resolve('../../mi-comercio-app');
for (const module of ['operation-alerts', 'management-notes']) esbuild.buildSync({ entryPoints: [resolve(panel, `lib/${module}.ts`)], bundle: true, platform: 'node', format: 'cjs', outfile: `.tmp/${module}-test.cjs`, tsconfig: resolve(panel, 'tsconfig.json') });
const { buildOperationAlerts } = require('../.tmp/operation-alerts-test.cjs');
const { managementNotes } = require('../.tmp/management-notes-test.cjs');
const base = { customerName: 'Prueba', serviceName: 'Corte', appointmentDate: '2026-09-09', appointmentTime: '10:00:00', durationMinutes: 40, price: 1000 };
const input = { timeZone: 'America/Argentina/Buenos_Aires', now: new Date('2026-09-09T15:00:00Z'), appointments: [
  { ...base, id: '1', status: 'pending', appointmentDate: '2026-09-08' },
  { ...base, id: '2', status: 'confirmed' },
  { ...base, id: '3', status: 'confirmed', appointmentTime: '15:00:00' },
  { ...base, id: '4', status: 'confirmed', appointmentDate: '2026-09-10' },
  { ...base, id: '5', status: 'cancelled' },
  { ...base, id: '6', status: 'completed' },
  { ...base, id: '7', status: 'confirmed', appointmentTime: '11:45:00' },
], payments: [{ appointmentId: '6', amount: 600, status: 'completed' }, { workRecordId: 'w1', amount: 100, status: 'completed' }], workRecords: [
  { id: 'w1', collectionVerified: true, amount: 200, customerName: 'Cliente A', serviceName: 'Corte', workDate: '2026-09-01' },
  { id: 'w2', collectionVerified: false, amount: 1000, customerName: 'Cliente B', serviceName: 'Corte', workDate: '2026-09-01' },
] };
const result = buildOperationAlerts(input);
assert.deepEqual(result.counts, { pending: 1, close: 1, today: 2, balance: 2, expense: 0, payroll: 0 });
assert.equal(result.attentionCount, 4);
assert.equal(result.alerts.find(a => a.id === 'balance:appointment:6').amount, 400);
assert.match(result.alerts.find(a => a.id === 'close:2').href, /appointment=2/);
assert.ok(result.alerts.find(a => a.id === 'pending:1').detail.includes('ya pasó'));
assert.equal(new Set(result.alerts.map(a => a.id)).size, result.alerts.length);
assert.ok(!result.alerts.some(a => a.id.endsWith(':w2')), 'An unverified receipt must not be treated as a collectible debt.');
const resolved = buildOperationAlerts({ ...input, appointments: input.appointments.map(a => ['1','2','6'].includes(a.id) ? { ...a, status: 'cancelled' } : a), payments: [...input.payments, { workRecordId: 'w1', amount: 100, status: 'completed' }] });
assert.equal(resolved.attentionCount, 0);
const midnight = buildOperationAlerts({ ...input, appointments: [{ ...base, id: '8', status: 'confirmed', appointmentTime: '23:30:00' }], payments: [], workRecords: [], now: new Date('2026-09-10T02:45:00Z') });
assert.equal(midnight.today, '2026-09-09'); assert.equal(midnight.counts.today, 1); assert.equal(midnight.counts.close, 0);
assert.equal(managementNotes('Origen: BASE_DATOS!A1:I1. Fecha original sin hora. Nota del cliente', '1:planilla-barberia:BASE_DATOS:1'), 'Nota del cliente');
assert.equal(managementNotes('Nota normal', null), 'Nota normal');
console.log('PASS: internal notifications respect business dates, completed/partial payments, unresolved collections and action destinations; resolving the work removes the alert.');
