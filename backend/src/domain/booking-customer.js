'use strict';
const { resources } = require('./repository');
const ACCOUNT = 'api::customer-account.customer-account';

// Called inside the business booking lock. Matching never exposes a client
// record to a visitor and never overwrites identity from an anonymous request.
async function bookingCustomer(strapi, businessId, input, account) {
  const db = strapi.db.query(resources.customers.uid);
  const scope = { business: { id: businessId } };
  const email = (account?.email || input.customerEmail || '').trim().toLowerCase();
  let customer = account?.customer_id ? await db.findOne({ where: { ...scope, id: account.customer_id } }) : null;
  if (!customer && email) {
    customer = await db.findOne({ where: { ...scope, email: { $eqi: email } }, orderBy: { id: 'asc' } });
  }
  if (!customer) {
    const contactMatches = await db.findMany({ where: { ...scope, primary_contact: { $eqi: input.contactInfo.trim() } }, orderBy: { id: 'asc' } });
    // A shared phone/Instagram must not combine different email identities.
    customer = contactMatches.find(row => email ? !row.email || row.email.trim().toLowerCase() === email : !row.email);
  }
  if (!customer) {
    customer = await strapi.documents(resources.customers.uid).create({ data: {
      business: businessId, full_name: input.clientName, primary_contact: input.contactInfo,
      email: email || null, status: 'lead', marketing_opt_in: false, joined_at: new Date().toISOString(),
    } });
  }
  if (account && account.customer_id !== customer.id) {
    await strapi.db.query(ACCOUNT).update({ where: { id: account.id, business_id: businessId }, data: { customer_id: customer.id } });
  }
  return customer;
}
module.exports = { bookingCustomer };
