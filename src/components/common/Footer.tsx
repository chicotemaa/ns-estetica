import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand"><Image src="/images/LOGO-1.png" alt="Logo de Natalia Sánchez" width={92} height={92} /><p>Natalia Sánchez <span>ESTÉTICA</span></p></div>
        <p className="footer-statement">Un momento para vos.<br /><em>Siempre.</em></p>
        <div className="footer-links"><a href="#services">Tratamientos</a><a href="#reservas">Reservas</a><a href="#about">Nosotros</a><a href="#contact">Contacto</a></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Natalia Sánchez Estética</span><span>Resistencia, Chaco · Argentina</span><a href="https://instagram.com/natalias.estetica" target="_blank" rel="noopener noreferrer">Instagram ↗</a></div>
    </footer>
  );
}
