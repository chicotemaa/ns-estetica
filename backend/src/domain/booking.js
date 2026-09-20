'use strict';
const { AsyncLocalStorage } = require('node:async_hooks');
const { createHash } = require('node:crypto');
const { errors } = require('@strapi/utils');
const { repository, resources, serialize } = require('./repository');
const { availableSlots, validDate, minutes } = require('./availability');
const writes = new AsyncLocalStorage();
const conflict = () =>
  new errors.ApplicationError(
    'Ese horario ya no está disponible. Elegí otro horario.',
    { code: 'SLOT_UNAVAILABLE' },
  );

async function locked(strapi, businessId, work) {
  return strapi.db.transaction(async ({ trx }) => {
    // PostgreSQL transaction lock also coordinates separate Railway processes.
    await trx.raw('SELECT pg_advisory_xact_lock(73421, ?)', [businessId]);
    return writes.run({ businessId }, work);
  });
}
async function schedule(strapi, businessId, date) {
  const repo = repository(strapi, businessId);
  const [
    services,
    staff,
    hours,
    staffHours,
    assignments,
    appointments,
    settings,
    businesses,
    variants,
  ] = await Promise.all([
    repo.records('services'),
    repo.records('staff_members'),
    repo.records('business_hours'),
    repo.records('staff_member_working_hours'),
    repo.records('staff_member_services'),
    repo.records('appointments', [
      { field: 'appointment_date', operator: 'eq', value: date },
    ]),
    repo.records('booking_settings'),
    repo.records('businesses'),
    repo.records('service_price_variants'),
  ]);
  if (settings.length !== 1)
    throw new errors.ValidationError(
      'Falta configurar los horarios de reserva.',
    );
  const holds = await require('./online-booking').activeHolds(strapi, businessId, date);
  return {
    services,
    staff,
    hours,
    staffHours,
    assignments,
    variants,
    appointments: [...appointments, ...holds],
    settings: settings[0],
    timeZone: businesses[0].time_zone || 'America/Argentina/Buenos_Aires',
  };
}
function choices(data, date, serviceId, staffId, options = {}) {
  const service = data.services.find((item) => item.id === String(serviceId));
  if (options.publicOnly !== false && service?.booking_enabled === false)
    return [];
  return data.staff
    .filter(
      (person) =>
        options.publicOnly === false || person.accepts_bookings !== false,
    )
    .filter((person) => !staffId || person.id === String(staffId))
    .map((staff) => ({
      staff,
      slots: availableSlots({ ...data, ...options, date, service, staff }),
    }));
}
async function validateAppointment(strapi, businessId, data, existing) {
  const previous = serialize('appointments', existing) || {};
  const next = {
    ...previous,
    ...data,
    service_id: data.service ?? previous.service_id,
    staff_member_id: data.staff_member ?? previous.staff_member_id,
  };
  if (
    !validDate(next.appointment_date) ||
    minutes(next.appointment_time) === null
  )
    throw new errors.ValidationError('Fecha u horario inválido.');
  if (next.status === 'cancelled') return;
  const moved =
    !existing ||
    [
      'appointment_date',
      'appointment_time',
      'service',
      'staff_member',
      'duration_snapshot',
    ].some(
      (key) =>
        data[key] !== undefined &&
        String(data[key]).slice(
          0,
          key === 'appointment_time' ? 5 : undefined,
        ) !==
          String(
            key === 'service'
              ? previous.service_id
              : key === 'staff_member'
                ? previous.staff_member_id
                : previous[key],
          ).slice(0, key === 'appointment_time' ? 5 : undefined),
    );
  if (!moved && previous.status !== 'cancelled') return;
  const state = await schedule(strapi, businessId, next.appointment_date);
  const service = state.services.find(
    (item) => item.id === String(next.service_id),
  );
  const duration = Number(
    data.duration_snapshot ??
      previous.duration_snapshot ??
      service?.duration_minutes,
  );
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440)
    throw new errors.ValidationError('Duración inválida.');
  // The panel may use a price/duration variant; validate its actual occupied time.
  const adjusted = {
    ...state,
    services: state.services.map((item) =>
      item.id === service?.id ? { ...item, duration_minutes: duration } : item,
    ),
  };
  const candidate = choices(
    adjusted,
    next.appointment_date,
    next.service_id,
    next.staff_member_id,
    { ignoreId: previous.id, enforceLead: !existing, publicOnly: false },
  ).find((item) => item.slots.includes(next.appointment_time.slice(0, 5)));
  if (!candidate) throw conflict();
  data.staff_member = Number(candidate.staff.id);
  data.staff_name_snapshot = candidate.staff.full_name;
  data.service_name_snapshot = service.name;
  data.duration_snapshot = duration;
}
function publicInput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new errors.ValidationError('Solicitud inválida.');
  const fields = [
    'clientName',
    'contactInfo',
    'customerEmail',
    'serviceId',
    'serviceVariantId',
    'staffMemberId',
    'appointmentDate',
    'appointmentTime',
    'notes',
  ];
  if (Object.keys(raw).some((key) => !fields.includes(key)))
    throw new errors.ValidationError(
      'La solicitud contiene campos no permitidos.',
    );
  const result = Object.fromEntries(
    fields.map((field) => [
      field,
      typeof raw[field] === 'string' ? raw[field].trim() : '',
    ]),
  );
  if (
    result.clientName.length < 2 ||
    result.clientName.length > 100 ||
    result.contactInfo.length < 3 ||
    result.contactInfo.length > 100 ||
    result.notes.length > 1000
  )
    throw new errors.ValidationError(
      'Revisá el nombre, contacto y comentario.',
    );
  if (
    result.customerEmail &&
    (result.customerEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.customerEmail))
  )
    throw new errors.ValidationError('Email inválido.');
  if (
    !/^[1-9]\d*$/.test(result.serviceId) ||
    (result.serviceVariantId && !/^[1-9]\d*$/.test(result.serviceVariantId)) ||
    (result.staffMemberId && !/^[1-9]\d*$/.test(result.staffMemberId)) ||
    !validDate(result.appointmentDate) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(result.appointmentTime)
  )
    throw new errors.ValidationError(
      'Servicio, profesional, fecha u horario inválido.',
    );
  if (!result.serviceVariantId) delete result.serviceVariantId;
  return result;
}
async function bookPublic(strapi, business, raw, key, account = null) {
  if ((await require('./customer-config').resolveConfiguration(strapi, business.id)).enabled)
    throw new errors.UnauthorizedError('Ingresá con tu cuenta y completá la seña para reservar.');
  if (
    typeof key !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      key,
    )
  )
    throw new errors.ValidationError('Falta el identificador de la solicitud.');
  const input = publicInput(account ? { ...raw, customerEmail: account.email } : raw);
  input.customerEmail = input.customerEmail.toLowerCase();
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const requestKey = `${business.id}:${key}`;
  return locked(strapi, business.id, async () => {
    const previous = await strapi.db
      .query(resources.appointments.uid)
      .findOne({ where: { request_key: requestKey } });
    if (previous) {
      if (previous.request_hash !== hash)
        throw new errors.ValidationError(
          'La solicitud cambió. Iniciá un nuevo envío.',
        );
      return {
        createdId: previous.documentId,
        status: previous.status,
        isLive: true,
      };
    }
    const state = require('./public-catalog').withVariant(
      await schedule(strapi, business.id, input.appointmentDate),
      input.serviceId,
      input.serviceVariantId,
    );
    const selected = choices(
      state,
      input.appointmentDate,
      input.serviceId,
      input.staffMemberId,
    ).find((item) => item.slots.includes(input.appointmentTime));
    if (!selected) throw conflict();
    const service = state.services.find((item) => item.id === input.serviceId);
    const customer = await require('./booking-customer').bookingCustomer(strapi, business.id, input, account);
    const record = await strapi.documents(resources.appointments.uid).create({
      data: {
        business: business.id,
        service: Number(service.id),
        staff_member: Number(selected.staff.id),
        customer: customer.id,
        customer_name: input.clientName,
        customer_contact: input.contactInfo,
        customer_email: input.customerEmail || null,
        appointment_date: input.appointmentDate,
        appointment_time: `${input.appointmentTime}:00.000`,
        status: 'confirmed',
        channel: 'website',
        notes: input.notes || null,
        service_name_snapshot: service.name,
        staff_name_snapshot: selected.staff.full_name,
        price_snapshot: Number(service.price),
        duration_snapshot: service.duration_minutes,
        request_key: requestKey,
        request_hash: hash,
      },
    });
    const total = await strapi.db
      .query(resources.appointments.uid)
      .count({ where: { customer: { id: customer.id } } });
    await strapi.documents(resources.customers.uid).update({
      documentId: customer.documentId,
      data: { total_appointments: total },
    });
    return {
      createdId: record.documentId,
      status: record.status,
      isLive: true,
    };
  });
}
module.exports = {
  locked,
  writes,
  schedule,
  choices,
  validateAppointment,
  publicInput,
  bookPublic,
};
