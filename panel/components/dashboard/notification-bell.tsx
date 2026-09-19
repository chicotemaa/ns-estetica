"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
export function NotificationBell() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let stopped = false,
      busy = false,
      last = 0;
    const controller = new AbortController();
    async function refresh() {
      if (
        busy ||
        document.visibilityState !== "visible" ||
        Date.now() - last < 15000
      )
        return;
      busy = true;
      last = Date.now();
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!stopped) setCount(data.unreadCount);
      } catch {
        /* Navigation remains available while the connection recovers. */
      } finally {
        busy = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    const changed = () => {
      last = 0;
      void refresh();
    };
    window.addEventListener("notifications:changed", changed);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("notifications:changed", changed);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return (
    <Link
      href="/dashboard/notifications"
      className="relative rounded-xl p-2 hover:bg-slate-100"
      aria-label={count ? `Avisos, ${count} sin ver` : "Ver avisos"}
    >
      <Bell className="h-5 w-5" />
      {count != null && count > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
