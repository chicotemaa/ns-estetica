'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { publicInput } = require('../src/domain/booking');
const {
  descriptor,
  filtersWhere,
  scope,
  serialize,
} = require('../src/domain/repository');
const manager = require('../src/policies/manager');
test('public payload rejects server-owned fields and invalid email/date', () => {
  const input = {
    clientName: ' Test ',
    contactInfo: '555123456',
    serviceId: '1',
    appointmentDate: '2026-09-12',
    appointmentTime: '12:00',
  };
  assert.equal(publicInput(input).clientName, 'Test');
  for (const injected of [
    { price_snapshot: 1 },
    { status: 'confirmed' },
    { business_id: 2 },
    { appointmentDate: '2026-02-30' },
    { customerEmail: 'invalid' },
  ])
    assert.throws(() => publicInput({ ...input, ...injected }));
});
test('resource queries enforce allowlisted fields and tenant scope', () => {
  assert.throws(() => descriptor('__proto__'));
  assert.throws(() =>
    filtersWhere('appointments', [
      { field: 'request_hash', operator: 'eq', value: 'secret' },
    ]),
  );
  assert.throws(() =>
    filtersWhere('appointments', [
      { field: 'id', operator: 'eq', value: '1 OR 1=1' },
    ]),
  );
  assert.deepEqual(scope('appointments', 7), { business: { id: 7 } });
  assert.deepEqual(scope('staff_member_services', 7), {
    staff_member: { business: { id: 7 } },
  });
  assert.equal(
    'request_hash' in
      serialize('appointments', { id: 1, request_hash: 'hidden' }),
    false,
  );
});
test('private routes reject anonymous, blocked and non-manager users', async () => {
  const ctx = { request: { header: {} }, state: {} };
  assert.equal(await manager(ctx, {}, { strapi: {} }), false);
  ctx.request.header.authorization = 'Bearer test';
  let user = { id: 1, role: { type: 'authenticated' } };
  const strapi = {
    plugin: () => ({ service: () => ({ verify: async () => ({ id: 1 }) }) }),
    db: { query: () => ({ findOne: async () => user }) },
  };
  assert.equal(await manager(ctx, {}, { strapi }), false);
  user = { id: 1, blocked: true, role: { type: 'business-manager' } };
  assert.equal(await manager(ctx, {}, { strapi }), false);
  user.blocked = false;
  assert.equal(await manager(ctx, {}, { strapi }), true);
});
