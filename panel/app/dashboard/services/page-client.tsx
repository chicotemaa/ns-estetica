"use client";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardPageShell } from "@/components/dashboard/page-shell";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SERVICE_CATEGORIES } from "@/lib/service-catalog";
import { formatCurrency, getServiceCategoryLabel } from "@/lib/business-shared";
import { Plus, Search } from "lucide-react";

import { ServiceDeleteDialog } from "./_components/service-delete-dialog";
import { ServiceFeedbackDialog } from "./_components/service-feedback-dialog";
import { ServiceFormDialog } from "./_components/service-form-dialog";
import { ServiceStatusDialog } from "./_components/service-status-dialog";
import { ServicesTable } from "./_components/services-table";
import type { ServiceSummary } from "./service-types";
import { useServicesController } from "./use-services-controller";

interface ServicesPageClientProps {
  businessName: string;
  isLive: boolean;
  services: ServiceSummary[];
}

export function ServicesPageClient({
  businessName,
  isLive,
  services,
}: ServicesPageClientProps) {
  const controller = useServicesController(services);

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        actions={
          <Button onClick={controller.openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo servicio
          </Button>
        }
        badge={
          !isLive ? (
            <Badge className="bg-amber-100 text-amber-900">
              Modo demostración
            </Badge>
          ) : null
        }
        description={`Servicios y precios de ${businessName}.`}
        eyebrow="Catálogo"
        title="Servicios"
      />

      <div className="metric-grid grid gap-4">
        <Link
          className="inline-flex rounded-lg border bg-white px-4 py-2 text-sm font-medium"
          href="/dashboard/services/prices"
        >
          Editar precios y variantes
        </Link>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Servicios activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {services.filter((service) => service.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Ticket promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(controller.averageTicket)}
            </div>
            <p className="text-xs text-slate-500">
              Promedio ponderado por reservas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Reservas acumuladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {services.reduce((total, service) => total + service.bookings, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar servicio</CardTitle>
          <CardDescription>
            Filtra por nombre, descripción o categoría
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              onChange={(event) => controller.setSearchTerm(event.target.value)}
              placeholder="Ej: corte, balayage, nanoplastia..."
              value={controller.searchTerm}
            />
          </div>
          <Select
            value={controller.categoryFilter}
            onValueChange={controller.setCategoryFilter}
          >
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {SERVICE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {getServiceCategoryLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo</CardTitle>
          <CardDescription>
            Activá las reservas online de cada servicio cuando su duración esté
            definida
          </CardDescription>
        </CardHeader>
        <CardContent>
          {controller.filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No hay servicios que coincidan con la búsqueda.
            </div>
          ) : (
            <ServicesTable
              onDelete={controller.openDeleteDialog}
              onEdit={controller.openEditDialog}
              onToggleStatus={controller.openToggleDialog}
              services={controller.filteredServices}
            />
          )}
        </CardContent>
      </Card>

      <ServiceFormDialog
        errorMessage={controller.formError}
        formState={controller.formState}
        isOpen={controller.isFormOpen}
        isSubmitting={controller.isSubmitting || controller.isRefreshing}
        onOpenChange={controller.handleFormOpenChange}
        onSubmit={() => void controller.submitForm()}
        onUpdateField={controller.updateFormField}
        serviceBeingEdited={controller.editingService}
      />

      <ServiceDeleteDialog
        isDeleting={controller.isDeleting || controller.isRefreshing}
        onConfirm={() => void controller.confirmDelete()}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeDeleteDialog();
          }
        }}
        service={controller.selectedServiceToDelete}
      />

      <ServiceStatusDialog
        isSubmitting={controller.isTogglingStatus || controller.isRefreshing}
        onConfirm={() => void controller.confirmToggleStatus()}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeToggleDialog();
          }
        }}
        service={controller.selectedServiceToToggle}
      />

      <ServiceFeedbackDialog
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
