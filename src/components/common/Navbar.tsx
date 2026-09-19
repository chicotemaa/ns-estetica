'use client';

import Image from 'next/image';
import { useState } from 'react';

const links = [
  { href: '#services', label: 'Tratamientos' },
  { href: '#about', label: 'Nosotros' },
  { href: '#workinfo', label: 'La experiencia' },
  { href: '#contact', label: 'Contacto' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand" href="#inicio" aria-label="Natalia Sánchez Estética, ir al inicio" onClick={() => setOpen(false)}>
          <Image src="/images/LOGO.png" alt="Logo de Natalia Sánchez" width={66} height={48} className="brand-logo" priority />
          <span className="brand-name">Natalia Sánchez <small>ESTÉTICA</small></span>
        </a>
        <nav className={open ? 'nav-links is-open' : 'nav-links'} aria-label="Navegación principal">
          {links.map(link => <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>)}
          <a href="#reservas" className="nav-mobile-book" onClick={() => setOpen(false)}>Reservar turno</a>
        </nav>
        <a href="#reservas" className="header-book">Reservar turno <span aria-hidden="true">↗</span></a>
        <button className="menu-toggle" type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /><span />
        </button>
      </div>
    </header>
  );
}
