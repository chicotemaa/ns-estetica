import { NextResponse } from "next/server";

import {
  getManagedBusiness,
  parseEmployeePayload,
  syncEmployeeRelations,
  validateEmployeeWorkingHoursAgainstBusinessHours,
  validateAssignedServices,
  type EmployeePayload,
} from "@/lib/employee-management";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const businessResult = await getManagedBusiness();

  if (businessResult.error || !businessResult.data) {
    return NextResponse.json(
      { error: businessResult.error ?? "No se pudo resolver el negocio." },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const payload = (await request.json()) as EmployeePayload;
  const parsed = parseEmployeePayload(payload);

  if (parsed.error || !parsed.data) {
    return badRequest(parsed.error ?? "Solicitud inválida.");
  }

  const validServices = await validateAssignedServices(
    businessResult.data,
    parsed.data.assignedServiceIds,
  );

  if (validServices.error) {
    return badRequest(validServices.error);
  }

  const workingHoursValidation =
    await validateEmployeeWorkingHoursAgainstBusinessHours(
      businessResult.data,
      parsed.data.workingHours,
    );

  if (workingHoursValidation.error) {
    return badRequest(workingHoursValidation.error);
  }

  const { backend, business } = businessResult.data;

  if (parsed.data.employeeCode) {
    const { data: duplicateEmployee, error: duplicateError } = await backend
      .from("staff_members")
      .select("id")
      .eq("business_id", business.id)
      .eq("employee_code", parsed.data.employeeCode)
      .neq("id", id)
      .maybeSingle();

    if (duplicateError) {
      return NextResponse.json(
        { error: "No se pudo validar el código interno del profesional." },
        { status: 500 },
      );
    }

    if (duplicateEmployee) {
      return badRequest("Ya existe otro profesional con ese código interno.");
    }
  }

  const { data, error } = await backend
    .from("staff_members")
    .update({
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      email: parsed.data.email,
      phone: parsed.data.phone,
      bio: parsed.data.bio,
      join_date: parsed.data.joinDate,
      employee_code: parsed.data.employeeCode,
      compensation_type: parsed.data.compensationType,
      payroll_mode:
        parsed.data.compensationType === "hourly" ? "hourly" : "percentage",
      collection_commission_rate: parsed.data.collectionCommissionRate,
      payroll_cadence: parsed.data.payrollCadence,
      payroll_weekday: parsed.data.payrollWeekday,
      payroll_cutoff_first: parsed.data.payrollCutoffFirst,
      payroll_cutoff_second: parsed.data.payrollCutoffSecond,
      payroll_pay_delay: parsed.data.payrollPayDelay,
      hourly_rate: parsed.data.hourlyRate,
      is_active: parsed.data.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", business.id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error:
          error?.code === "42703"
            ? "Revisá la configuración de Strapi para editar la forma de pago del profesional."
            : "No se pudo actualizar el profesional.",
      },
      { status: 500 },
    );
  }

  const syncResult = await syncEmployeeRelations(
    businessResult.data,
    id,
    parsed.data,
  );

  if (syncResult.error) {
    return NextResponse.json({ error: syncResult.error }, { status: 500 });
  }

  return NextResponse.json({
    employee: data,
    warning: syncResult.warning ?? null,
  });
}
