import Image from 'next/image';

export default function About() {
  return (
    <section id="about" className="about-section section-pad">
      <div className="about-visual">
        <div className="about-photo"><Image src="/images/masajes.jpg" alt="Sesión de masaje en Natalia Sánchez Estética" fill sizes="(max-width: 800px) 100vw, 48vw" className="cover-image" /></div>
        <span className="about-caption">UN ESPACIO PARA VOS <span aria-hidden="true">✳</span></span>
      </div>
      <div className="about-copy">
        <p className="eyebrow">SOBRE NOSOTROS</p>
        <h2>La belleza empieza <em>por sentirte bien.</em></h2>
        <p>En Natalia Sánchez Estética creemos en el cuidado como un momento propio. Cada tratamiento es una oportunidad para hacer una pausa y dedicarte atención.</p>
        <p>Te acompañamos con una atención cercana y propuestas pensadas para tu piel y tu bienestar.</p>
        <a href="#contact" className="text-link">Conocé nuestro espacio <span aria-hidden="true">→</span></a>
      </div>
    </section>
  );
}
