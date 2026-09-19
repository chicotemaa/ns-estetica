'use client';

import { useState } from 'react';
import emailjs from 'emailjs-com';

export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setStatus('');
    try {
      await emailjs.sendForm('service_lvilpoe', 'template_qh6nghr', form, 'xSYdNx6M-wFz6YpKC');
      form.reset();
      setStatus('Tu mensaje fue enviado. Nos comunicaremos con vos pronto.');
    } catch {
      setStatus('No pudimos enviar el mensaje. Intentá de nuevo o escribinos por Instagram.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="contact" className="contact-section section-pad">
      <div className="contact-intro">
        <p className="eyebrow">CONTACTO</p>
        <h2>Hablemos de <em>tu momento.</em></h2>
        <p>Si tenés una consulta sobre los tratamientos, escribinos y te ayudamos a encontrar la mejor opción.</p>
        <div className="contact-details">
          <div><span>VISITANOS</span><p>Wilde 12, local 1, planta baja<br />Resistencia, Chaco</p></div>
          <div><span>ESCRIBINOS</span><p><a href="tel:+543624654117">+54 3624 654117</a><br /><a href="mailto:nabrizka@hotmail.com">nabrizka@hotmail.com</a></p></div>
        </div>
      </div>
      <form className="contact-form" onSubmit={submit}>
        <div className="contact-form-head"><span>ENVIANOS UN MENSAJE</span><span aria-hidden="true">✳</span></div>
        <label>Tu nombre<input name="from_name" type="text" required maxLength={100} placeholder="¿Cómo te llamás?" /></label>
        <label>Tu email<input name="reply_to" type="email" required maxLength={254} placeholder="tu@email.com" /></label>
        <label>Tu consulta<textarea name="message" required maxLength={2000} rows={4} placeholder="Contanos en qué podemos ayudarte" /></label>
        <button className="button-primary" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar mensaje'} <span aria-hidden="true">↗</span></button>
        {status && <p role="status" className="contact-status">{status}</p>}
      </form>
    </section>
  );
}
