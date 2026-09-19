const steps = [
  { number: '01', title: 'Escucharte', copy: 'Empezamos por conocer qué buscás y cómo querés sentirte.' },
  { number: '02', title: 'Acompañarte', copy: 'Elegimos un tratamiento acorde a tus necesidades y preferencias.' },
  { number: '03', title: 'Cuidarte', copy: 'Creamos un espacio tranquilo para que disfrutes el momento.' },
];

export default function WorkInfo() {
  return (
    <section id="workinfo" className="experience-section section-pad">
      <div className="experience-top">
        <div><p className="eyebrow">LA EXPERIENCIA</p><h2>Un ritual de cuidado <em>a tu medida.</em></h2></div>
        <p>Nos importa tanto el resultado como la forma en que vivís cada visita.</p>
      </div>
      <div className="experience-grid">
        {steps.map(step => <article key={step.number} className="experience-step"><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div></article>)}
      </div>
      <div className="location-strip"><span>VISITANOS</span><p>Av. Wilde 12 · Resistencia, Chaco</p><a href="#contact">Cómo llegar <span aria-hidden="true">↗</span></a></div>
    </section>
  );
}
