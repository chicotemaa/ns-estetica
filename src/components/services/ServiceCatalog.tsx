'use client';

import { useState } from 'react';
import type { CatalogService } from '@/lib/public-site';

const categories: Record<string, string> = { corte: 'Facial', coloraciones: 'Corporal', tratamiento: 'Manos y pies' };
const money = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);

export default function ServiceCatalog({ services, title, onChoose }: { services?: CatalogService[]; title: string; onChoose: (id: string) => void }) {
  const [category, setCategory] = useState('all');
  const groups = Array.from(new Set((services || []).map(s => categories[s.category || ''] || 'Otros tratamientos')));
  const visible = (services || []).filter(s => category === 'all' || (categories[s.category || ''] || 'Otros tratamientos') === category);
  return <section id="services" className="services-section section-pad">
    <div className="section-heading"><div><p className="eyebrow">CARTA DE TRATAMIENTOS</p><h2>{title}</h2></div><p>Encontrá tu próximo momento de cuidado. Conocé cada tratamiento, su duración y su precio.</p></div>
    {groups.length > 1 && <div className="catalog-filters" aria-label="Filtrar tratamientos">{['all', ...groups].map(group => <button type="button" key={group} aria-pressed={category === group} onClick={() => setCategory(group)}>{group === 'all' ? 'Todos los tratamientos' : group}</button>)}</div>}
    <div className="treatment-grid">{visible.map((s, i) => <article key={s.id} className="treatment-card">
      <div className="treatment-top"><span>{categories[s.category || ''] || 'Tratamiento'}</span><span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span></div>
      <h3>{s.name}</h3><p className="treatment-description">{s.description || 'Consultanos para conocer los detalles de este tratamiento.'}</p>
      {s.variants && s.variants.length > 1 ? <ul className="treatment-variants">{s.variants.map(v => <li key={v.id}><span>{v.name}{v.durationMinutes ? ` · ${v.durationMinutes} min` : ''}</span><strong>{money(v.price)}</strong></li>)}</ul> : <div className="treatment-facts"><strong>{money(s.price)}</strong><span>{s.durationMinutes ? `${s.durationMinutes} minutos` : 'Duración a consultar'}</span></div>}
      {s.bookingEnabled !== false ? <a href="#reservas" onClick={() => onChoose(s.id)} aria-label={`Reservar ${s.name}`}>Elegir tratamiento <span aria-hidden="true">↗</span></a> : <a href="#contact">Consultar por este tratamiento <span aria-hidden="true">↗</span></a>}
    </article>)}</div>
    {!visible.length && <p role="status">{services ? 'Próximamente vas a encontrar nuestros tratamientos acá.' : 'No pudimos cargar los tratamientos. Actualizá la página o escribinos para consultar.'}</p>}
  </section>;
}
