"use client";
import { useEffect, useState } from "react";
import ZoneSelector, {
  QuoteSummary,
  type ZonePricing,
  type ZoneQuote,
} from "./ZoneSelector";
export default function ZoneEstimate({
  serviceId,
  config,
}: {
  serviceId: string;
  config: ZonePricing;
}) {
  const [ids, setIds] = useState<string[]>([]),
    [full, setFull] = useState(false),
    [quote, setQuote] = useState<ZoneQuote | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    setQuote(null);
    setError("");
    if (!ids.length && !full) return;
    const c = new AbortController();
    fetch(
      `/api/reservas/quote?${new URLSearchParams({ serviceId, zoneIds: ids.join(","), fullBody: String(full) })}`,
      { signal: c.signal, cache: "no-store" },
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw Error(d.error?.message || "No pudimos calcular el total.");
        return d;
      })
      .then((d) => {
        if (!c.signal.aborted) setQuote(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [serviceId, ids, full]);
  return (
    <details className="zone-estimate">
      <summary>Ver zonas y calcular mi precio</summary>
      <ZoneSelector
        config={config}
        ids={ids}
        fullBody={full}
        onChange={(a, b) => {
          setIds(a);
          setFull(b);
        }}
      />
      {quote && <QuoteSummary quote={quote} />}{" "}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
