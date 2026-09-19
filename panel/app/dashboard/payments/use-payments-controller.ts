"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  ExpenseRecord,
  PaymentRecord,
  PayoutRecord,
} from "@/lib/business-shared";

import type {
  ExpenseFormState,
  MovementFeedbackState,
  MovementKind,
  MovementPeriod,
  MovementRecord,
  MovementTab,
  PaymentFormState,
  PaymentOptionCustomer,
  PaymentOptionStaff,
  PayoutFormState,
} from "./payment-types";
import {
  createExpenseFormState,
  createPaymentFormState,
  createPayoutFormState,
} from "./payment-utils";
import {
  getExpenseDateValue,
  getMovementPeriodMeta,
  getPaymentDateValue,
  getPayoutDateValue,
  isDateInMovementPeriod,
} from "./payment-period-utils";

function createFeedbackState(
  title: string,
  description: string,
  tone: MovementFeedbackState["tone"],
) {
  return { title, description, tone } satisfies MovementFeedbackState;
}

export function usePaymentsController({
  customers,
  expenses,
  payments,
  payouts,
  staffMembers,
  timeZone,
}: {
  customers: PaymentOptionCustomer[];
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
  payouts: PayoutRecord[];
  staffMembers: PaymentOptionStaff[];
  timeZone: string;
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<MovementTab>("payments");
  const [periodFilter, setPeriodFilter] = useState<MovementPeriod>("month");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | PaymentFormState["status"]
  >("all");
  const [selectedMovement, setSelectedMovement] =
    useState<MovementRecord | null>(null);
  const [editingMovement, setEditingMovement] = useState<MovementRecord | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<MovementRecord | null>(null);
  const [formKind, setFormKind] = useState<MovementKind | null>(null);
  const [paymentFormState, setPaymentFormState] = useState<PaymentFormState>(
    createPaymentFormState(),
  );
  const [expenseFormState, setExpenseFormState] = useState<ExpenseFormState>(
    createExpenseFormState(),
  );
  const [payoutFormState, setPayoutFormState] = useState<PayoutFormState>(
    createPayoutFormState(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackState, setFeedbackState] =
    useState<MovementFeedbackState | null>(null);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const haystack = [
        payment.description,
        payment.customerName ?? "",
        payment.staffName ?? "",
        payment.invoiceNumber ?? "",
        payment.transactionId ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || payment.status === statusFilter;
      const matchesPeriod = isDateInMovementPeriod(
        getPaymentDateValue(payment),
        periodFilter,
        timeZone,
      );

      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }, [payments, periodFilter, searchTerm, statusFilter, timeZone]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch = [
        expense.description,
        expense.category,
        expense.subcategory ?? "",
        expense.vendorName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesPeriod = isDateInMovementPeriod(
        getExpenseDateValue(expense),
        periodFilter,
        timeZone,
      );

      return matchesSearch && matchesPeriod;
    });
  }, [expenses, periodFilter, searchTerm, timeZone]);

  const filteredPayouts = useMemo(() => {
    return payouts.filter((payout) => {
      const matchesSearch = [
        payout.recipientName,
        payout.category,
        payout.staffName ?? "",
        payout.notes ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesPeriod = isDateInMovementPeriod(
        getPayoutDateValue(payout),
        periodFilter,
        timeZone,
      );

      return matchesSearch && matchesPeriod;
    });
  }, [payouts, periodFilter, searchTerm, timeZone]);

  const periodMeta = useMemo(
    () => getMovementPeriodMeta(periodFilter, timeZone),
    [periodFilter, timeZone],
  );

  function refreshData() {
    startTransition(() => {
      router.refresh();
    });
  }

  function resetMovementForms() {
    setEditingMovement(null);
    setFormKind(null);
    setPaymentFormState(createPaymentFormState());
    setExpenseFormState(createExpenseFormState());
    setPayoutFormState(createPayoutFormState());
    setFormError(null);
  }

  function openCreateDialog(kind: MovementKind) {
    resetMovementForms();
    setFormKind(kind);
  }

  function openEditDialog(movement: MovementRecord) {
    setEditingMovement(movement);
    setFormKind(movement.kind);
    setFormError(null);

    if (movement.kind === "payment") {
      setPaymentFormState(createPaymentFormState(movement.data));
      return;
    }

    if (movement.kind === "expense") {
      setExpenseFormState(createExpenseFormState(movement.data));
      return;
    }

    setPayoutFormState(createPayoutFormState(movement.data));
  }

  function closeFormDialog() {
    resetMovementForms();
  }

  function updatePaymentField<K extends keyof PaymentFormState>(
    field: K,
    value: PaymentFormState[K],
  ) {
    setPaymentFormState((current) => ({ ...current, [field]: value }));
  }

  function updateExpenseField<K extends keyof ExpenseFormState>(
    field: K,
    value: ExpenseFormState[K],
  ) {
    setExpenseFormState((current) => ({ ...current, [field]: value }));
  }

  function updatePayoutField<K extends keyof PayoutFormState>(
    field: K,
    value: PayoutFormState[K],
  ) {
    setPayoutFormState((current) => ({ ...current, [field]: value }));
  }

  function updatePayoutStaffMember(staffMemberId: string) {
    setPayoutFormState((current) => {
      const staffMember =
        staffMembers.find((entry) => entry.id === staffMemberId) ?? null;

      return {
        ...current,
        staffMemberId,
        recipientName: staffMember?.fullName ?? current.recipientName,
      };
    });
  }

  async function submitCurrentForm() {
    if (!formKind) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const isEditing = Boolean(editingMovement);
    const endpoint = isEditing
      ? `/api/${formKind === "payment" ? "payments" : formKind === "expense" ? "expenses" : "payouts"}/${editingMovement?.data.id}`
      : `/api/${formKind === "payment" ? "payments" : formKind === "expense" ? "expenses" : "payouts"}`;
    const method = isEditing ? "PATCH" : "POST";

    const payload =
      formKind === "payment"
        ? {
            description: paymentFormState.description,
            amount: Number(paymentFormState.amount),
            method: paymentFormState.method,
            status: paymentFormState.status,
            customerId: paymentFormState.customerId || null,
            staffMemberId: paymentFormState.staffMemberId || null,
            transactionId: paymentFormState.transactionId,
            processedAt: paymentFormState.processedAt || null,
            notes: paymentFormState.notes,
          }
        : formKind === "expense"
          ? {
              expenseDate: expenseFormState.expenseDate,
              category: expenseFormState.category,
              subcategory: expenseFormState.subcategory,
              description: expenseFormState.description,
              vendorName: expenseFormState.vendorName,
              amount: Number(expenseFormState.amount),
              method: expenseFormState.method,
              source: expenseFormState.source,
              notes: expenseFormState.notes,
            }
          : {
              payoutDate: payoutFormState.payoutDate,
              recipientName: payoutFormState.recipientName,
              recipientType: payoutFormState.recipientType,
              category: payoutFormState.category,
              staffMemberId: payoutFormState.staffMemberId || null,
              amount: Number(payoutFormState.amount),
              method: payoutFormState.method,
              source: payoutFormState.source,
              notes: payoutFormState.notes,
            };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setFormError(body?.error ?? "No se pudo guardar el movimiento.");
        return;
      }

      closeFormDialog();
      setFeedbackState(
        createFeedbackState(
          isEditing ? "Movimiento actualizado" : "Movimiento creado",
          isEditing
            ? "El movimiento se actualizó correctamente."
            : "El movimiento se creó correctamente.",
          "success",
        ),
      );
      refreshData();
    } catch {
      setFormError("Ocurrió un problema al guardar el movimiento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openDeleteDialog(movement: MovementRecord) {
    setDeleteTarget(movement);
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);

    try {
      const endpoint =
        deleteTarget.kind === "payment"
          ? `/api/payments/${deleteTarget.data.id}`
          : deleteTarget.kind === "expense"
            ? `/api/expenses/${deleteTarget.data.id}`
            : `/api/payouts/${deleteTarget.data.id}`;

      const response = await fetch(endpoint, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setFeedbackState(
          createFeedbackState(
            "No se pudo eliminar",
            body?.error ?? "Ocurrió un problema al eliminar el movimiento.",
            "error",
          ),
        );
        return;
      }

      const kindLabel =
        deleteTarget.kind === "payment"
          ? "cobro"
          : deleteTarget.kind === "expense"
            ? "gasto"
            : "distribución";

      setFeedbackState(
        createFeedbackState(
          "Movimiento eliminado",
          `El ${kindLabel} se eliminó correctamente.`,
          "success",
        ),
      );
      closeDeleteDialog();
      refreshData();
    } catch {
      setFeedbackState(
        createFeedbackState(
          "No se pudo eliminar",
          "Ocurrió un problema al eliminar el movimiento.",
          "error",
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    activeTab,
    closeDeleteDialog,
    closeFeedbackDialog: () => setFeedbackState(null),
    closeFormDialog,
    confirmDelete,
    customers,
    deleteTarget,
    editingMovement,
    expenseFormState,
    feedbackState,
    filteredExpenses,
    filteredPayments,
    filteredPayouts,
    formError,
    formKind,
    isDeleting,
    isRefreshing,
    isSubmitting,
    openCreateDialog,
    openDeleteDialog,
    openEditDialog,
    paymentFormState,
    payoutFormState,
    periodFilter,
    periodMeta,
    searchTerm,
    selectedMovement,
    setActiveTab,
    setPeriodFilter,
    setSearchTerm,
    setSelectedMovement,
    setStatusFilter,
    staffMembers,
    statusFilter,
    submitCurrentForm,
    updateExpenseField,
    updatePaymentField,
    updatePayoutField,
    updatePayoutStaffMember,
  };
}
