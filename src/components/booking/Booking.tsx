import { useEffect, useRef, useState } from 'react';

type Service = { id: string; name: string; price: number; bookingEnabled?: boolean; variants?: { id: string; name: string; price: number }[] };
type Staff = { id: string; fullName: string };
type Catalog = { services: Service[]; staffMembers: Staff[]; isLive: boolean };

async function readJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || 'No pudimos completar la consulta.');
  return body;
}

export default function Booking() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [sent, setSent] = useState(false);
  const request = useRef<{ body: string; key: string } | null>(null);

  useEffect(() => {
    fetch('/api/reservas/catalog').then(readJson).then((value: Catalog) => {
      if (!value.isLive) throw new Error('Las reservas todavía no están habilitadas.');
      setCatalog(value);
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!serviceId || !date) { setTimes([]); return; }
    const controller = new AbortController();
    const query = new URLSearchParams({ date, serviceId, staffMemberId: staffId });
    if (variantId) query.set('serviceVariantId', variantId);
    setTimes([]);
    setTime('');
    setError('');
    fetch(`/api/reservas/availability?${query}`, { signal: controller.signal })
      .then(readJson).then((value: { times: string[] }) => setTimes(value.times))
      .catch((reason: Error) => { if (reason.name !== 'AbortError') setError(reason.message); });
    return () => controller.abort();
  }, [serviceId, variantId, staffId, date]);

  const service = catalog?.services.find((item) => item.id === serviceId);
  const inputClass = 'w-full rounded border border-gray-300 bg-white p-3 text-gray-900';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const body = JSON.stringify({ clientName: name, contactInfo: contact, customerEmail: email, serviceId, serviceVariantId: variantId, staffMemberId: staffId, appointmentDate: date, appointmentTime: time, notes });
      if (request.current?.body !== body) request.current = { body, key: crypto.randomUUID() };
      await readJson(await fetch('/api/reservas/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': request.current.key },
        body,
      }));
      setSent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos enviar la solicitud.'); }
    finally { setBusy(false); }
  }

  return <section id="reservas" className="bg-white px-6 py-20 text-gray-900 dark:bg-gray-900 dark:text-white">
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-3 text-3xl font-bold">Reservá tu turno</h2>
      <p className="mb-8">Elegí un tratamiento y un horario disponible. Te contactaremos para confirmar.</p>
      {error && <p role="alert" className="mb-5 rounded bg-red-100 p-4 text-red-800">{error}</p>}
      {sent ? <p role="status" className="rounded bg-green-100 p-5 text-green-900">Recibimos tu solicitud. Te contactaremos para confirmar el turno.</p> : catalog ?
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label>Tratamiento<select required className={inputClass} value={serviceId} onChange={e => { setServiceId(e.target.value); setVariantId(''); }}><option value="">Elegí un tratamiento</option>{catalog.services.filter(s => s.bookingEnabled !== false).map(s => <option key={s.id} value={s.id}>{s.name} · {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(s.price)}</option>)}</select></label>
          {service?.variants && service.variants.length > 1 && <label>Variante<select required className={inputClass} value={variantId} onChange={e => setVariantId(e.target.value)}><option value="">Elegí una variante</option>{service.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>}
          <label>Profesional<select className={inputClass} value={staffId} onChange={e => setStaffId(e.target.value)}><option value="">Sin preferencia</option>{catalog.staffMembers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select></label>
          <label>Fecha<input required type="date" min={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })} className={inputClass} value={date} onChange={e => setDate(e.target.value)} /></label>
          <label>Horario<select required className={inputClass} value={time} onChange={e => setTime(e.target.value)}><option value="">Elegí un horario</option>{times.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
          <label>Nombre<input required minLength={2} maxLength={100} className={inputClass} value={name} onChange={e => setName(e.target.value)} /></label>
          <label>Teléfono o Instagram<input required minLength={3} maxLength={100} className={inputClass} value={contact} onChange={e => setContact(e.target.value)} /></label>
          <label>Email opcional<input type="email" className={inputClass} value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="md:col-span-2">Comentario opcional<textarea maxLength={1000} className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} /></label>
          <button disabled={busy || !time} className="rounded bg-gray-900 px-6 py-3 font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-gray-900">{busy ? 'Enviando…' : 'Solicitar turno'}</button>
        </form> : !error && <p>Cargando servicios…</p>}
    </div>
  </section>;
}
