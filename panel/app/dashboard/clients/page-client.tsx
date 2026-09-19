"use client";

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
import { formatCurrency } from "@/lib/business-shared";
import { Plus, Search } from "lucide-react";

import { ClientDetailDialog } from "./_components/client-detail-dialog";
import { ClientFeedbackDialog } from "./_components/client-feedback-dialog";
import { ClientFormDialog } from "./_components/client-form-dialog";
import { ClientsTable } from "./_components/clients-table";
import type { ClientSummary } from "./client-types";
import { useClientsController } from "./use-clients-controller";

interface ClientsPageClientProps {
  businessName: string;
  customers: ClientSummary[];
  isLive: boolean;
  timeZone: string;
}

export function ClientsPageClient({
  businessName,
  customers,
  isLive,
  timeZone,
}: ClientsPageClientProps) {
  const controller = useClientsController(customers);

  const activeClients = customers.filter(
    (client) => client.status === "active",
  ).length;
  const repeatClients = customers.filter(
    (client) => client.totalAppointments > 1,
  ).length;
  const newClientsThisMonth = customers.filter((client) => {
    const joinedAt = new Date(client.joinedAt);
    const limit = new Date();
    limit.setDate(limit.getDate() - 30);
    return joinedAt >= limit;
  }).length;
  const totalSpent = customers.reduce(
    (sum, client) => sum + client.totalSpent,
    0,
  );

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        actions={
          <Button onClick={controller.openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Button>
        }
        badge={
          !isLive ? (
            <Badge className="bg-amber-100 text-amber-900">
              Modo demostración
            </Badge>
          ) : null
        }
        description={`Contactos e historial de clientes de ${businessName}.`}
        eyebrow="CRM"
        title="Clientes"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {customers.length}
            </div>
            <p className="text-xs text-slate-500">{activeClients} activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Nuevos 30 días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {newClientsThisMonth}
            </div>
            <p className="text-xs text-slate-500">Altas recientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes recurrentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {repeatClients}
            </div>
            <p className="text-xs text-slate-500">Con más de una cita</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos acumulados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(totalSpent)}
            </div>
            <p className="text-xs text-slate-500">
              Total atribuido a clientes registrados
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Busca por nombre, contacto, email, teléfono o Instagram.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              onChange={(event) => controller.setSearchTerm(event.target.value)}
              placeholder="Buscar cliente"
              value={controller.searchTerm}
            />
          </div>

          <Select
            value={controller.statusFilter}
            onValueChange={(value) =>
              controller.setStatusFilter(
                value as "all" | ClientSummary["status"],
              )
            }
          >
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Base de clientes</CardTitle>
          <CardDescription>
            {controller.filteredClients.length} registros visibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {controller.filteredClients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No hay clientes que coincidan con los filtros.
            </div>
          ) : (
            <ClientsTable
              clients={controller.filteredClients}
              onEdit={controller.openEditDialog}
              onView={controller.setSelectedClient}
              timeZone={timeZone}
            />
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        clientBeingEdited={controller.editingClient}
        errorMessage={controller.formError}
        formState={controller.formState}
        isOpen={controller.isFormOpen}
        isSubmitting={controller.isSubmitting || controller.isRefreshing}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeFormDialog();
          }
        }}
        onSubmit={() => void controller.submitForm()}
        onUpdateField={controller.updateFormField}
      />

      <ClientDetailDialog
        client={controller.selectedClient}
        onOpenChange={(open) => {
          if (!open) {
            controller.setSelectedClient(null);
          }
        }}
        timeZone={timeZone}
      />

      <ClientFeedbackDialog
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
