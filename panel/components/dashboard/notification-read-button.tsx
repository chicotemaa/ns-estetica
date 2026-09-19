"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function NotificationReadButton({
  items,
  read,
  label,
}: {
  items: { id: string; revision: string }[];
  read: boolean;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, read }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "No se pudo guardar el estado.");
      if (data.updated !== items.length)
        setError(
          "Algunos avisos cambiaron. Revisá la información actualizada.",
        );
      window.dispatchEvent(new Event("notifications:changed"));
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el estado.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-w-0">
      <Button
        variant="outline"
        size="sm"
        disabled={busy || !items.length}
        onClick={save}
      >
        {busy ? "Guardando…" : label}
      </Button>
      {error && (
        <p role="alert" className="mt-1 max-w-xs text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
