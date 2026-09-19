"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatDisplayDate,
  getPaymentMethodLabel,
} from "@/lib/business-shared";
import { Eye, Pencil, Trash2 } from "lucide-react";

import type { ExpenseRecord } from "@/lib/business-shared";

interface ExpensesTableProps {
  expenses: ExpenseRecord[];
  onDelete: (expense: ExpenseRecord) => void;
  onEdit: (expense: ExpenseRecord) => void;
  onView: (expense: ExpenseRecord) => void;
  timeZone: string;
}

export function ExpensesTable({
  expenses,
  onDelete,
  onEdit,
  onView,
  timeZone,
}: ExpensesTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table
        mobileLabels={[
          "Fecha",
          "Categoría",
          "Detalle",
          "Proveedor",
          "Método",
          "Importe",
          "Acciones",
        ]}
        className="min-w-[980px]"
      >
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead className="w-28 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>
                {formatDisplayDate(expense.expenseDate, timeZone)}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-slate-900">
                    {expense.category}
                  </p>
                  <p className="text-sm text-slate-500">
                    {expense.subcategory ?? "Sin subtipo"}
                  </p>
                </div>
              </TableCell>
              <TableCell>{expense.description}</TableCell>
              <TableCell>{expense.vendorName ?? "Sin proveedor"}</TableCell>
              <TableCell>{getPaymentMethodLabel(expense.method)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(expense.amount)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Ver detalle"
                    onClick={() => onView(expense)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!!expense.importRef}
                    title={
                      expense.importRef ? "Movimiento registrado" : "Editar"
                    }
                    aria-label="Editar registro"
                    onClick={() => onEdit(expense)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!!expense.importRef}
                    aria-label="Eliminar registro"
                    onClick={() => onDelete(expense)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
