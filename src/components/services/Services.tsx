import Image from 'next/image';

const services = [
  { number: '01', name: 'Masajes', detail: 'Un espacio para aflojar tensiones y volver a vos.', image: '/images/masajes.jpg', alt: 'Masaje descontracturante' },
  { number: '02', name: 'Tratamientos faciales', detail: 'Cuidado de la piel pensado para tus necesidades.', image: '/images/faciales.jpg', alt: 'Aplicación de un tratamiento facial' },
  { number: '03', name: 'Manicura', detail: 'Tiempo para cuidar los detalles que te acompañan.', image: '/images/manicura.jpg', alt: 'Servicio de manicura' },
];

export default function Services() {
  return (
    <section id="services" className="services-section section-pad">
      <div className="section-heading">
        <div><p className="eyebrow">TRATAMIENTOS</p><h2>Un cuidado para <em>cada momento.</em></h2></div>
        <p>Elegí el tratamiento que mejor acompañe lo que necesitás hoy.</p>
      </div>
      <div className="service-grid">
        {services.map(service => <article key={service.number} className="service-card">
          <div className="service-photo"><Image src={service.image} alt={service.alt} fill sizes="(max-width: 800px) 100vw, 33vw" className="cover-image" /></div>
          <div className="service-meta"><span>{service.number} / TRATAMIENTOS</span><span aria-hidden="true">↗</span></div>
          <h3>{service.name}</h3><p>{service.detail}</p>
          <a href="#reservas" aria-label={`Reservar ${service.name}`}>Reservar tratamiento <span aria-hidden="true">→</span></a>
        </article>)}
      </div>
    </section>
  );
}
