import { getBusinessScheduleBundle } from "@/lib/business-data"

import { HoursPageClient } from "./page-client"

export const dynamic = "force-dynamic"

export default async function HoursPage() {
  const { business, businessHours, bookingSettings, isLive } = await getBusinessScheduleBundle()

  return (
    <HoursPageClient
      bookingSettings={bookingSettings}
      businessHours={businessHours}
      businessName={business.name}
      isLive={isLive}
    />
  )
}
