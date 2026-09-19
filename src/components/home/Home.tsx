import Image from 'next/image';

export default function Home() {
  return (
    <section id="inicio" className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-line" /> NATALIA SÁNCHEZ · ESTÉTICA</p>
        <h1>Tu momento<br /><em>de bienestar.</em></h1>
        <p className="hero-description">Tratamientos para conectar con vos, cuidar tu piel y sentirte bien en cada etapa.</p>
        <div className="hero-actions">
          <a className="button-primary" href="#reservas">Reservar turno <span aria-hidden="true">↗</span></a>
          <a className="text-link" href="#services">Explorar tratamientos <span aria-hidden="true">→</span></a>
        </div>
        <p className="hero-footnote">Cuidado personal · Atención personalizada</p>
      </div>
      <div className="hero-visual">
        <div className="hero-image-wrap">
          <Image src="/images/faciales.jpg" alt="Tratamiento facial de cuidado de la piel" fill priority sizes="(max-width: 800px) 100vw, 50vw" className="cover-image" />
        </div>
        <div className="hero-image-note"><span>01 / 03</span><span>Belleza natural, a tu ritmo.</span></div>
        <span className="hero-outline" aria-hidden="true">NS</span>
      </div>
    </section>
  );
}
