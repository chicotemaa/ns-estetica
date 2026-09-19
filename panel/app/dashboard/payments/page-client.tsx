"use client";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardPageShell } from "@/components/dashboard/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  CustomerRecord,
  ExpenseRecord,
  PaymentRecord,
  PayoutRecord,
  StaffRecord,
} from "@/lib/business-shared";
import { formatCurrency, getPaymentMethodLabel } from "@/lib/business-shared";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarRange,
  Plus,
  Search,
  Wallet,
} from "lucide-react";

import { ExpenseFormDialog } from "./_components/expense-form-dialog";
import { ExpensesTable } from "./_components/expenses-table";
import { MovementDeleteDialog } from "./_components/movement-delete-dialog";
import { MovementDetailDialog } from "./_components/movement-detail-dialog";
import { MovementFeedbackDialog } from "./_components/movement-feedback-dialog";
import { PaymentFormDialog } from "./_components/payment-form-dialog";
import { PaymentsTable } from "./_components/payments-table";
import { PayoutFormDialog } from "./_components/payout-form-dialog";
import { PayoutsTable } from "./_components/payouts-table";
import { MOVEMENT_PERIOD_OPTIONS } from "./payment-period-utils";
import type { MovementTab } from "./payment-types";
import { usePaymentsController } from "./use-payments-controller";

interface PaymentsPageClientProps {
  businessName: string;
  customers: CustomerRecord[];
  expenses: ExpenseRecord[];
  isLive: boolean;
  payments: PaymentRecord[];
  payouts: PayoutRecord[];
  staffMembers: StaffRecord[];
  timeZone: string;
}

export function PaymentsPageClient({
  businessName,
  customers,
  expenses,
  isLive,
  payments,
  payouts,
  staffMembers,
  timeZone,
}: PaymentsPageClientProps) {
  const controller = usePaymentsController({
    customers: customers.map((customer) => ({
      id: customer.id,
      fullName: customer.fullName,
    })),
    expenses,
    payments,
    payouts,
    staffMembers: staffMembers
      .filter((staffMember) => staffMember.isActive)
      .map((staffMember) => ({
        id: staffMember.id,
        fullName: staffMember.fullName,
      })),
    timeZone,
  });

  const completedRevenue = controller.filteredPayments
    .filter((payment) => payment.status === "completed")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingRevenue = controller.filteredPayments
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalExpenses = controller.filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const totalPayouts = controller.filteredPayouts.reduce(
    (sum, payout) => sum + payout.amount,
    0,
  );
  const netResult = completedRevenue - totalExpenses - totalPayouts;

  const paymentMethods = Array.from(
    controller.filteredPayments
      .filter((payment) => payment.status === "completed")
      .reduce((map, payment) => {
        map.set(
          payment.method,
          (map.get(payment.method) ?? 0) + payment.amount,
        );
        return map;
      }, new Map<PaymentRecord["method"], number>()),
  );

  const expenseCategories = Array.from(
    controller.filteredExpenses.reduce((map, expense) => {
      map.set(
        expense.category,
        (map.get(expense.category) ?? 0) + expense.amount,
      );
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1]);

  const payoutRecipients = Array.from(
    controller.filteredPayouts.reduce((map, payout) => {
      map.set(
        payout.recipientName,
        (map.get(payout.recipientName) ?? 0) + payout.amount,
      );
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1]);

  const isPaymentFormOpen = controller.formKind === "payment";
  const isExpenseFormOpen = controller.formKind === "expense";
  const isPayoutFormOpen = controller.formKind === "payout";

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        actions={
          <>
            <Button asChild>
              <Link href="/dashboard/checkout">
                <Wallet className="mr-2 h-4 w-4" />
                Abrir checkout
              </Link>
            </Button>
            <Button
              variant={
                controller.activeTab === "payments" ? "default" : "outline"
              }
              onClick={() => controller.openCreateDialog("payment")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Cobro sin turno
            </Button>
            <Button
              variant={
                controller.activeTab === "expenses" ? "default" : "outline"
              }
              onClick={() => controller.openCreateDialog("expense")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo gasto
            </Button>
            <Button
              variant={
                controller.activeTab === "payouts" ? "default" : "outline"
              }
              onClick={() => controller.openCreateDialog("payout")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva distribución
            </Button>
          </>
        }
        badge={
          !isLive ? (
            <Badge className="bg-amber-100 text-amber-900">
              Modo demostración
            </Badge>
          ) : null
        }
        description={`Ingresos, gastos y pagos de ${businessName}.`}
        eyebrow="Caja"
        supporting={
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
            <CalendarRange className="h-3.5 w-3.5" />
            <span className="font-medium text-slate-900">
              {controller.periodMeta.title}
            </span>
            <span>{controller.periodMeta.rangeLabel}</span>
          </div>
        }
        title="Caja y movimientos"
      />

      <div className="metric-grid grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cobrado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(completedRevenue)}
            </div>
            <p className="text-xs text-slate-500">
              {
                controller.filteredPayments.filter(
                  (payment) => payment.status === "completed",
                ).length
              }{" "}
              cobros en {controller.periodMeta.chipLabel.toLowerCase()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(pendingRevenue)}
            </div>
            <p className="text-xs text-slate-500">
              Cobros sin cerrar del período
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-slate-500">
              {controller.filteredExpenses.length} movimientos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Distribuciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalPayouts)}
            </div>
            <p className="text-xs text-slate-500">
              {controller.filteredPayouts.length} salidas
            </p>
          </CardContent>
        </Card>
        <Card className={netResult < 0 ? "border-rose-200" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Resultado neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${netResult < 0 ? "text-rose-700" : "text-slate-900"}`}
            >
              {formatCurrency(netResult)}
            </div>
            <p className="text-xs text-slate-500">
              Cobrado menos egresos y distribuciones
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            La búsqueda y el período aplican sobre cobros, gastos y
            distribuciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {MOVEMENT_PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={
                  controller.periodFilter === option.value
                    ? "default"
                    : "outline"
                }
                onClick={() => controller.setPeriodFilter(option.value)}
                size="sm"
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                onChange={(event) =>
                  controller.setSearchTerm(event.target.value)
                }
                placeholder="Buscar movimiento"
                value={controller.searchTerm}
              />
            </div>

            <Select
              value={controller.statusFilter}
              onValueChange={(value) =>
                controller.setStatusFilter(
                  value as "all" | PaymentRecord["status"],
                )
              }
            >
              <SelectTrigger className="w-full lg:w-56">
                <SelectValue placeholder="Estado de cobro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los cobros</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="failed">Fallidos</SelectItem>
                <SelectItem value="refunded">Reintegrados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={controller.activeTab}
        onValueChange={(value) => controller.setActiveTab(value as MovementTab)}
        className="w-full"
      >
        <div className="overflow-x-auto">
          <TabsList className="w-full">
            <TabsTrigger value="payments">Cobros</TabsTrigger>
            <TabsTrigger value="expenses">Gastos</TabsTrigger>
            <TabsTrigger value="payouts">Distribuciones</TabsTrigger>
            <TabsTrigger value="summary">Resumen</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cobros registrados</CardTitle>
              <CardDescription>
                {controller.filteredPayments.length} registros en{" "}
                {controller.periodMeta.chipLabel.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {controller.filteredPayments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  No hay cobros que coincidan con los filtros del período.
                </div>
              ) : (
                <PaymentsTable
                  onDelete={(payment) =>
                    controller.openDeleteDialog({
                      kind: "payment",
                      data: payment,
                    })
                  }
                  onEdit={(payment) =>
                    controller.openEditDialog({
                      kind: "payment",
                      data: payment,
                    })
                  }
                  onView={(payment) =>
                    controller.setSelectedMovement({
                      kind: "payment",
                      data: payment,
                    })
                  }
                  payments={controller.filteredPayments}
                  timeZone={timeZone}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gastos del negocio</CardTitle>
              <CardDescription>
                {controller.filteredExpenses.length} egresos en{" "}
                {controller.periodMeta.chipLabel.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {controller.filteredExpenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  No hay gastos que coincidan con la búsqueda del período.
                </div>
              ) : (
                <ExpensesTable
                  expenses={controller.filteredExpenses}
                  onDelete={(expense) =>
                    controller.openDeleteDialog({
                      kind: "expense",
                      data: expense,
                    })
                  }
                  onEdit={(expense) =>
                    controller.openEditDialog({
                      kind: "expense",
                      data: expense,
                    })
                  }
                  onView={(expense) =>
                    controller.setSelectedMovement({
                      kind: "expense",
                      data: expense,
                    })
                  }
                  timeZone={timeZone}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuciones y pagos a terceros</CardTitle>
              <CardDescription>
                {controller.filteredPayouts.length} movimientos en{" "}
                {controller.periodMeta.chipLabel.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {controller.filteredPayouts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  No hay distribuciones que coincidan con la búsqueda del
                  período.
                </div>
              ) : (
                <PayoutsTable
                  onDelete={(payout) =>
                    controller.openDeleteDialog({
                      kind: "payout",
                      data: payout,
                    })
                  }
                  onEdit={(payout) =>
                    controller.openEditDialog({ kind: "payout", data: payout })
                  }
                  onView={(payout) =>
                    controller.setSelectedMovement({
                      kind: "payout",
                      data: payout,
                    })
                  }
                  payouts={controller.filteredPayouts}
                  timeZone={timeZone}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Cobros por método</CardTitle>
                <CardDescription>
                  Solo pagos completados de {controller.periodMeta.rangeLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map(([method, amount]) => (
                    <div
                      key={method}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-slate-600">
                        {getPaymentMethodLabel(method)}
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Sin cobros completados todavía.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gastos por categoría</CardTitle>
                <CardDescription>
                  Top egresos del período activo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {expenseCategories.length > 0 ? (
                  expenseCategories.slice(0, 5).map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-slate-600">{category}</span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Sin gastos registrados todavía.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuciones principales</CardTitle>
                <CardDescription>
                  Salidas por destinatario del período
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {payoutRecipients.length > 0 ? (
                  payoutRecipients.slice(0, 5).map(([recipient, amount]) => (
                    <div
                      key={recipient}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-slate-600">
                        {recipient}
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Sin distribuciones registradas todavía.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="metric-grid grid gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <ArrowDownCircle className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-sm text-slate-500">Entrada real</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatCurrency(completedRevenue)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <ArrowUpCircle className="h-8 w-8 text-rose-600" />
                <div>
                  <p className="text-sm text-slate-500">Salida operativa</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatCurrency(totalExpenses + totalPayouts)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Wallet className="h-8 w-8 text-sky-600" />
                <div>
                  <p className="text-sm text-slate-500">Caja neta</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatCurrency(netResult)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <PaymentFormDialog
        customers={controller.customers}
        errorMessage={controller.formError}
        formState={controller.paymentFormState}
        isOpen={isPaymentFormOpen}
        isSubmitting={controller.isSubmitting || controller.isRefreshing}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeFormDialog();
          }
        }}
        onSubmit={() => void controller.submitCurrentForm()}
        onUpdateField={controller.updatePaymentField}
        paymentBeingEdited={
          controller.editingMovement?.kind === "payment" || false
        }
        staffMembers={controller.staffMembers}
      />

      <ExpenseFormDialog
        errorMessage={controller.formError}
        expenseBeingEdited={
          controller.editingMovement?.kind === "expense" || false
        }
        formState={controller.expenseFormState}
        isOpen={isExpenseFormOpen}
        isSubmitting={controller.isSubmitting || controller.isRefreshing}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeFormDialog();
          }
        }}
        onSubmit={() => void controller.submitCurrentForm()}
        onUpdateField={controller.updateExpenseField}
      />

      <PayoutFormDialog
        errorMessage={controller.formError}
        formState={controller.payoutFormState}
        isOpen={isPayoutFormOpen}
        isSubmitting={controller.isSubmitting || controller.isRefreshing}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeFormDialog();
          }
        }}
        onSubmit={() => void controller.submitCurrentForm()}
        onUpdateField={controller.updatePayoutField}
        onUpdateStaffMember={controller.updatePayoutStaffMember}
        payoutBeingEdited={
          controller.editingMovement?.kind === "payout" || false
        }
        staffMembers={controller.staffMembers}
      />

      <MovementDetailDialog
        movement={controller.selectedMovement}
        onOpenChange={(open) => {
          if (!open) {
            controller.setSelectedMovement(null);
          }
        }}
        timeZone={timeZone}
      />

      <MovementDeleteDialog
        isSubmitting={controller.isDeleting || controller.isRefreshing}
        movement={controller.deleteTarget}
        onConfirm={() => void controller.confirmDelete()}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeDeleteDialog();
          }
        }}
      />

      <MovementFeedbackDialog
        feedback={controller.feedbackState}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeFeedbackDialog();
          }
        }}
      />
    </DashboardPageShell>
  );
}
