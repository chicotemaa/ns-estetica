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

export async function POST(request: Request) {
  const businessResult = await getManagedBusiness();

  if (businessResult.error || !businessResult.data) {
    return NextResponse.json(
      { error: businessResult.error ?? "No se pudo resolver el negocio." },
      { status: 500 },
    );
  }

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
      .maybeSingle();

    if (duplicateError) {
      return NextResponse.json(
        { error: "No se pudo validar el código interno del profesional." },
        { status: 500 },
      );
    }

    if (duplicateEmployee) {
      return badRequest("Ya existe un profesional con ese código interno.");
    }
  }

  const { data, error } = await backend
    .from("staff_members")
    .insert({
      business_id: business.id,
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
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error:
          error?.code === "42703"
            ? "Revisá la configuración de Strapi para guardar empleados con forma de pago."
            : "No se pudo crear el profesional.",
      },
      { status: 500 },
    );
  }

  const syncResult = await syncEmployeeRelations(
    businessResult.data,
    data.id,
    parsed.data,
  );

  if (syncResult.error) {
    return NextResponse.json({ error: syncResult.error }, { status: 500 });
  }

  return NextResponse.json(
    { employee: data, warning: syncResult.warning ?? null },
    { status: 201 },
  );
}
