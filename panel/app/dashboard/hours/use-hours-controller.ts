"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  BookingSettingsRecord,
  BusinessHourRecord,
} from "@/lib/business-shared";

import type {
  BookingRulesFormState,
  HoursDayFormState,
  HoursFeedbackState,
} from "./hours-types";

function mapBusinessHourToForm(day: BusinessHourRecord): HoursDayFormState {
  return {
    dayOfWeek: day.dayOfWeek,
    label: day.label,
    isOpen: day.isOpen,
    openTime: day.openTime?.slice(0, 5) ?? "",
    closeTime: day.closeTime?.slice(0, 5) ?? "",
    breakStartTime: day.breakStartTime?.slice(0, 5) ?? "",
    breakEndTime: day.breakEndTime?.slice(0, 5) ?? "",
  };
}

function mapBookingSettingsToForm(
  settings: BookingSettingsRecord,
): BookingRulesFormState {
  return {
    slotIntervalMinutes: String(settings.slotIntervalMinutes),
    leadTimeMinutes: String(settings.leadTimeMinutes),
    maxBookingDaysInAdvance: String(settings.maxBookingDaysInAdvance),
    bufferBetweenAppointmentsMinutes: String(
      settings.bufferBetweenAppointmentsMinutes,
    ),
  };
}

function createFeedbackState(
  title: string,
  description: string,
  tone: HoursFeedbackState["tone"],
): HoursFeedbackState {
  return {
    title,
    description,
    tone,
  };
}

function serializeState(
  days: HoursDayFormState[],
  bookingRules: BookingRulesFormState,
) {
  return JSON.stringify({
    days,
    bookingRules,
  });
}

export function useHoursController(
  businessHours: BusinessHourRecord[],
  bookingSettings: BookingSettingsRecord,
) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [days, setDays] = useState<HoursDayFormState[]>(() =>
    businessHours.map(mapBusinessHourToForm),
  );
  const [bookingRules, setBookingRules] = useState<BookingRulesFormState>(() =>
    mapBookingSettingsToForm(bookingSettings),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackState, setFeedbackState] = useState<HoursFeedbackState | null>(
    null,
  );

  const initialDays = businessHours.map(mapBusinessHourToForm);
  const initialBookingRules = mapBookingSettingsToForm(bookingSettings);
  const isDirty =
    serializeState(days, bookingRules) !==
    serializeState(initialDays, initialBookingRules);
  const openDays = days.filter((day) => day.isOpen);
  const earliestOpenTime =
    openDays
      .map((day) => day.openTime)
      .filter(Boolean)
      .sort()[0] ?? null;
  const latestCloseTime =
    openDays
      .map((day) => day.closeTime)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  useEffect(() => {
    setDays(businessHours.map(mapBusinessHourToForm));
    setBookingRules(mapBookingSettingsToForm(bookingSettings));
  }, [businessHours, bookingSettings]);

  function refreshData() {
    startTransition(() => {
      router.refresh();
    });
  }

  function closeFeedbackDialog() {
    setFeedbackState(null);
  }

  function resetForm() {
    setDays(initialDays);
    setBookingRules(initialBookingRules);
  }

  function toggleDayOpen(dayOfWeek: number, checked: boolean) {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              isOpen: checked,
              openTime: checked ? day.openTime || "09:00" : "",
              closeTime: checked ? day.closeTime || "18:00" : "",
              breakStartTime: checked ? day.breakStartTime : "",
              breakEndTime: checked ? day.breakEndTime : "",
            }
          : day,
      ),
    );
  }

  function updateDayTime(
    dayOfWeek: number,
    field: "openTime" | "closeTime" | "breakStartTime" | "breakEndTime",
    value: string,
  ) {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day,
      ),
    );
  }

  function updateBookingRule(
    field: keyof BookingRulesFormState,
    value: string,
  ) {
    setBookingRules((currentRules) => ({
      ...currentRules,
      [field]: value,
    }));
  }

  async function submitForm() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/hours", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          days: days.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            isOpen: day.isOpen,
            openTime: day.isOpen ? day.openTime : null,
            closeTime: day.isOpen ? day.closeTime : null,
            breakStartTime:
              day.isOpen && day.breakStartTime ? day.breakStartTime : null,
            breakEndTime:
              day.isOpen && day.breakEndTime ? day.breakEndTime : null,
          })),
          bookingSettings: {
            slotIntervalMinutes: Number(bookingRules.slotIntervalMinutes),
            leadTimeMinutes: Number(bookingRules.leadTimeMinutes),
            maxBookingDaysInAdvance: Number(
              bookingRules.maxBookingDaysInAdvance,
            ),
            bufferBetweenAppointmentsMinutes: Number(
              bookingRules.bufferBetweenAppointmentsMinutes,
            ),
          },
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        warning?: string | null;
      } | null;

      if (!response.ok) {
        setFeedbackState(
          createFeedbackState(
            "No se pudo guardar",
            body?.error ??
              "Ocurrió un problema al guardar los horarios y reglas de reserva.",
            "error",
          ),
        );
        return;
      }

      setFeedbackState(
        createFeedbackState(
          body?.warning
            ? "Horarios actualizados con advertencia"
            : "Horarios actualizados",
          body?.warning ??
            "La disponibilidad general del negocio y las reglas de turnos se guardaron correctamente.",
          body?.warning ? "warning" : "success",
        ),
      );
      refreshData();
    } catch {
      setFeedbackState(
        createFeedbackState(
          "No se pudo guardar",
          "Ocurrió un problema al guardar los horarios y reglas de reserva.",
          "error",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    bookingRules,
    closeFeedbackDialog,
    days,
    earliestOpenTime,
    feedbackState,
    isDirty,
    isRefreshing,
    isSubmitting,
    latestCloseTime,
    openDaysCount: openDays.length,
    resetForm,
    submitForm,
    toggleDayOpen,
    updateBookingRule,
    updateDayTime,
  };
}
