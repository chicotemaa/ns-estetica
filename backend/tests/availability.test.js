'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  availableSlots,
  localNow,
  validDate,
} = require('../src/domain/availability');
const baseline = {
  date: '2026-09-12',
  now: new Date('2026-09-09T13:00:00Z'),
  timeZone: 'America/Argentina/Buenos_Aires',
  service: { id: '1', is_active: true, duration_minutes: 60 },
  staff: { id: '1', is_active: true },
  hours: [
    { day_of_week: 6, is_open: true, open_time: '12:00', close_time: '16:00' },
  ],
  staffHours: [],
  assignments: [],
  appointments: [],
  settings: {
    max_booking_days_in_advance: 30,
    lead_time_minutes: 120,
    slot_interval_minutes: 30,
    buffer_between_appointments_minutes: 0,
  },
};
test('uses Argentina date at UTC midnight, rejects impossible calendar dates', () => {
  assert.equal(
    localNow(baseline.timeZone, new Date('2026-09-10T01:00:00Z')).date,
    '2026-09-09',
  );
  assert.equal(validDate('2026-02-30'), false);
});
test('respects Saturday opening, duration at closing and closed days', () => {
  assert.deepEqual(availableSlots(baseline), [
    '12:00',
    '12:30',
    '13:00',
    '13:30',
    '14:00',
    '14:30',
    '15:00',
  ]);
  assert.deepEqual(availableSlots({ ...baseline, date: '2026-09-13' }), []);
});
test('respects employee hours, breaks, service assignments and inactive staff', () => {
  const state = {
    ...baseline,
    staffHours: [
      {
        staff_member_id: '1',
        day_of_week: 6,
        is_active: true,
        start_time: '13:00',
        end_time: '16:00',
        break_start_time: '14:00',
        break_end_time: '14:30',
      },
    ],
  };
  assert.deepEqual(availableSlots(state), ['13:00', '14:30', '15:00']);
  assert.deepEqual(
    availableSlots({
      ...state,
      assignments: [{ staff_member_id: '1', service_id: '2' }],
    }),
    [],
  );
  assert.deepEqual(
    availableSlots({
      ...state,
      staff: { ...baseline.staff, is_active: false },
    }),
    [],
  );
});
test('blocks overlapping pending appointments and buffer on either side; cancellation releases slot', () => {
  const appointment = {
    id: '7',
    staff_member_id: '1',
    appointment_date: baseline.date,
    appointment_time: '13:00',
    duration_snapshot: 60,
    status: 'pending',
  };
  const state = {
    ...baseline,
    appointments: [appointment],
    settings: { ...baseline.settings, buffer_between_appointments_minutes: 15 },
  };
  assert.deepEqual(availableSlots(state), ['14:30', '15:00']);
  assert.deepEqual(
    availableSlots({
      ...state,
      appointments: [{ ...appointment, status: 'cancelled' }],
    }),
    availableSlots(baseline),
  );
});
test('enforces lead time, booking horizon and excludes appointments from other staff', () => {
  assert.deepEqual(
    availableSlots({ ...baseline, now: new Date('2026-09-12T15:15:00Z') }),
    ['14:30', '15:00'],
  );
  assert.deepEqual(
    availableSlots({
      ...baseline,
      settings: { ...baseline.settings, max_booking_days_in_advance: 1 },
    }),
    [],
  );
  assert.deepEqual(
    availableSlots({
      ...baseline,
      appointments: [
        {
          id: '1',
          staff_member_id: '2',
          appointment_date: baseline.date,
          appointment_time: '12:00',
          duration_snapshot: 300,
          status: 'confirmed',
        },
      ],
    }),
    availableSlots(baseline),
  );
});
