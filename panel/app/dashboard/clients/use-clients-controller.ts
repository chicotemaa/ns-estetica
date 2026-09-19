"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  ClientFeedbackState,
  ClientFormState,
  ClientSummary,
} from "./client-types";
import { createClientFormState } from "./client-utils";

function createFeedbackState(
  title: string,
  description: string,
  tone: ClientFeedbackState["tone"],
) {
  return { title, description, tone } satisfies ClientFeedbackState;
}

export function useClientsController(clients: ClientSummary[]) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | ClientFormState["status"]
  >("all");
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(
    null,
  );
  const [editingClient, setEditingClient] = useState<ClientSummary | null>(
    null,
  );
  const [formState, setFormState] = useState<ClientFormState>(
    createClientFormState(),
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] =
    useState<ClientFeedbackState | null>(null);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const haystack = [
        client.fullName,
        client.email ?? "",
        client.primaryContact,
        client.phone ?? "",
        client.instagramHandle ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  function refreshData() {
    startTransition(() => {
      router.refresh();
    });
  }

  function resetForm() {
    setEditingClient(null);
    setFormState(createClientFormState());
    setFormError(null);
  }

  function openCreateDialog() {
    resetForm();
    setIsFormOpen(true);
  }

  function openEditDialog(client: ClientSummary) {
    setEditingClient(client);
    setFormState(createClientFormState(client));
    setFormError(null);
    setIsFormOpen(true);
  }

  function closeFormDialog() {
    setIsFormOpen(false);
    resetForm();
  }

  function updateFormField<K extends keyof ClientFormState>(
    field: K,
    value: ClientFormState[K],
  ) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitForm() {
    setIsSubmitting(true);
    setFormError(null);

    const endpoint = editingClient
      ? `/api/customers/${editingClient.id}`
      : "/api/customers";
    const method = editingClient ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formState.fullName,
          primaryContact: formState.primaryContact,
          email: formState.email,
          phone: formState.phone,
          instagramHandle: formState.instagramHandle,
          address: formState.address,
          preferredServices: formState.preferredServices,
          notes: formState.notes,
          status: formState.status,
          rating: formState.rating === "" ? null : Number(formState.rating),
          marketingOptIn: formState.marketingOptIn,
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setFormError(body?.error ?? "No se pudo guardar el cliente.");
        return;
      }

      closeFormDialog();
      setFeedbackState(
        createFeedbackState(
          editingClient ? "Cliente actualizado" : "Cliente creado",
          editingClient
            ? "Los datos del cliente se actualizaron correctamente."
            : "El cliente se agregó correctamente a la base.",
          "success",
        ),
      );
      refreshData();
    } catch {
      setFormError("Ocurrió un problema al guardar el cliente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    closeFeedbackDialog: () => setFeedbackState(null),
    closeFormDialog,
    editingClient,
    feedbackState,
    filteredClients,
    formError,
    formState,
    isFormOpen,
    isRefreshing,
    isSubmitting,
    openCreateDialog,
    openEditDialog,
    searchTerm,
    selectedClient,
    setSearchTerm,
    setSelectedClient,
    setStatusFilter,
    statusFilter,
    submitForm,
    updateFormField,
  };
}
