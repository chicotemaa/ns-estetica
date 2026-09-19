// Technical provenance remains in the backend; operator notes stay readable.
export function managementNotes(
  notes: string | null,
  legacyReference?: string | null,
) {
  if (!notes || !legacyReference?.includes(":planilla-barberia:")) return notes;
  return (
    notes
      .replace(
        /^Origen: (?:BASE_DATOS|DIA)!A\d+:I\d+\.\s*(?:Fecha original sin hora\.\s*)?/,
        "",
      )
      .trim() || null
  );
}
