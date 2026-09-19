"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { getDefaultDurationMinutes } from "@/lib/service-catalog"
import { getServiceCategoryLabel } from "@/lib/business-shared"

import type { ServiceFeedbackState, ServiceFormState, ServiceSummary } from "./service-types"
import { createServiceFormState } from "./service-utils"

function createFeedbackState(title: string, description: string, tone: ServiceFeedbackState["tone"]) {
  return {
    title,
    description,
    tone,
  } satisfies ServiceFeedbackState
}

export function useServicesController(services: ServiceSummary[]) {
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [editingService, setEditingService] = useState<ServiceSummary | null>(null)
  const [serviceToDelete, setServiceToDelete] = useState<ServiceSummary | null>(null)
  const [serviceToToggle, setServiceToToggle] = useState<ServiceSummary | null>(null)
  const [formState, setFormState] = useState<ServiceFormState>(createServiceFormState())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [feedbackState, setFeedbackState] = useState<ServiceFeedbackState | null>(null)

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const normalizedSearch = searchTerm.toLowerCase()
      const matchesSearch =
        service.name.toLowerCase().includes(normalizedSearch) ||
        service.description?.toLowerCase().includes(normalizedSearch) ||
        getServiceCategoryLabel(service.category).toLowerCase().includes(normalizedSearch)

      const matchesCategory = categoryFilter === "all" || service.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, searchTerm, services])

  const totalBookings = services.reduce((total, service) => total + service.bookings, 0)
  const totalBookingRevenue = services.reduce((total, service) => total + service.bookingRevenue, 0)
  const averageTicket =
    totalBookings > 0
      ? totalBookingRevenue / totalBookings
      : services.length > 0
        ? services.reduce((total, service) => total + service.price, 0) / services.length
        : 0

  function resetForm() {
    setEditingService(null)
    setFormState(createServiceFormState())
    setFormError(null)
  }

  function handleFormOpenChange(open: boolean) {
    setIsFormOpen(open)

    if (!open) {
      resetForm()
    }
  }

  function openCreateDialog() {
    resetForm()
    setIsFormOpen(true)
  }

  function openEditDialog(service: ServiceSummary) {
    setEditingService(service)
    setFormState(createServiceFormState(service))
    setFormError(null)
    setIsFormOpen(true)
  }

  function updateFormField<K extends keyof ServiceFormState>(field: K, value: ServiceFormState[K]) {
    setFormState((current) => {
      if (field === "category") {
        const nextCategory = value as ServiceFormState["category"]
        const currentDefault = String(getDefaultDurationMinutes(current.category))
        const nextDefault = String(getDefaultDurationMinutes(nextCategory))

        return {
          ...current,
          category: nextCategory,
          durationMinutes: current.durationMinutes === currentDefault ? nextDefault : current.durationMinutes,
        }
      }

      return {
        ...current,
        [field]: value,
      }
    })
  }

  async function refreshData() {
    startTransition(() => {
      router.refresh()
    })
  }

  async function submitForm() {
    setIsSubmitting(true)
    setFormError(null)

    const endpoint = editingService ? `/api/services/${editingService.id}` : "/api/services"
    const method = editingService ? "PATCH" : "POST"

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description,
          price: Number(formState.price),
          category: formState.category,
          durationMinutes: formState.durationMinutes ? Number(formState.durationMinutes) : null,
          bookingEnabled: formState.bookingEnabled,
          isActive: editingService?.isActive ?? true,
        }),
      })

      const body = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        setFormError(body?.error ?? "No se pudo guardar el servicio.")
        return
      }

      handleFormOpenChange(false)
      setFeedbackState(
        createFeedbackState(
          editingService ? "Servicio actualizado" : "Servicio creado",
          editingService
            ? "El servicio se actualizó correctamente en el catálogo."
            : "El servicio se agregó correctamente al catálogo compartido.",
          "success",
        ),
      )
      await refreshData()
    } catch {
      setFormError("Ocurrió un problema al guardar el servicio.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(service: ServiceSummary) {
    setServiceToDelete(service)
  }

  function closeDeleteDialog() {
    setServiceToDelete(null)
  }

  function openToggleDialog(service: ServiceSummary) {
    setServiceToToggle(service)
  }

  function closeToggleDialog() {
    setServiceToToggle(null)
  }

  async function confirmDelete() {
    if (!serviceToDelete) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/services/${serviceToDelete.id}`, { method: "DELETE" })
      const body = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        closeDeleteDialog()
        setFeedbackState(
          createFeedbackState(
            "No se pudo eliminar",
            body?.error ?? "Ocurrió un problema al eliminar el servicio.",
            "error",
          ),
        )
        return
      }

      closeDeleteDialog()
      setFeedbackState(
        createFeedbackState(
          "Servicio eliminado",
          "El servicio se eliminó correctamente del catálogo.",
          "success",
        ),
      )
      await refreshData()
    } catch {
      closeDeleteDialog()
      setFeedbackState(
        createFeedbackState("No se pudo eliminar", "Ocurrió un problema al eliminar el servicio.", "error"),
      )
    } finally {
      setIsDeleting(false)
    }
  }

  async function confirmToggleStatus() {
    if (!serviceToToggle) {
      return
    }

    setIsTogglingStatus(true)

    try {
      const response = await fetch(`/api/services/${serviceToToggle.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !serviceToToggle.isActive,
        }),
      })

      const body = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        closeToggleDialog()
        setFeedbackState(
          createFeedbackState(
            "No se pudo actualizar",
            body?.error ?? "Ocurrió un problema al cambiar el estado del servicio.",
            "error",
          ),
        )
        return
      }

      const nextIsActive = !serviceToToggle.isActive

      closeToggleDialog()
      setFeedbackState(
        createFeedbackState(
          nextIsActive ? "Servicio activado" : "Servicio desactivado",
          nextIsActive
            ? "El servicio volvió a estar disponible en el catálogo."
            : "El servicio dejó de estar disponible sin necesidad de borrarlo.",
          "success",
        ),
      )
      await refreshData()
    } catch {
      closeToggleDialog()
      setFeedbackState(
        createFeedbackState(
          "No se pudo actualizar",
          "Ocurrió un problema al cambiar el estado del servicio.",
          "error",
        ),
      )
    } finally {
      setIsTogglingStatus(false)
    }
  }

  function closeFeedbackDialog() {
    setFeedbackState(null)
  }

  return {
    averageTicket,
    categoryFilter,
    closeDeleteDialog,
    closeFeedbackDialog,
    closeToggleDialog,
    confirmDelete,
    confirmToggleStatus,
    filteredServices,
    formError,
    formState,
    handleFormOpenChange,
    isDeleting,
    isFormOpen,
    isRefreshing,
    isSubmitting,
    isTogglingStatus,
    openCreateDialog,
    openDeleteDialog,
    openEditDialog,
    openToggleDialog,
    feedbackState,
    searchTerm,
    selectedServiceToDelete: serviceToDelete,
    selectedServiceToToggle: serviceToToggle,
    editingService,
    setCategoryFilter,
    setSearchTerm,
    services,
    submitForm,
    updateFormField,
  }
}
