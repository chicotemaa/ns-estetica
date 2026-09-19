import { getBusinessDataBundle } from "@/lib/business-data"

import { ServicesPageClient } from "./page-client"

export const dynamic = "force-dynamic"

export default async function ServicesPage() {
  const { business, services, appointments, isLive } = await getBusinessDataBundle()
  const serviceSummaries = services.map((service) => ({
    ...service,
    bookings: appointments.filter((appointment) => appointment.serviceId === service.id).length,
    bookingRevenue: appointments
      .filter((appointment) => appointment.serviceId === service.id)
      .reduce((total, appointment) => total + appointment.price, 0),
  }))

  return <ServicesPageClient businessName={business.name} isLive={isLive} services={serviceSummaries} />
}
