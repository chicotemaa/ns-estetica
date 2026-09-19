import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
export function CheckoutButton({
  appointment,
}: {
  appointment: { id: string };
}) {
  return (
    <Button size="sm" asChild>
      <Link href={`/dashboard/checkout?appointment=${appointment.id}`}>
        <Wallet size={14} /> Abrir checkout
      </Link>
    </Button>
  );
}
