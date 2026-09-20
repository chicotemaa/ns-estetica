'use client';

import { useState } from 'react';
import emailjs from 'emailjs-com';

export default function ContactForm({contact={address:'Wilde 12, local 1, planta baja',phone:'+543624654117',email:'nabrizka@hotmail.com'},preview=false,copy={eyebrow:'Contacto',title:'Hablemos de tu momento.',body:'Si tenés una consulta sobre los tratamientos, escribinos y te ayudamos a encontrar la mejor opción.'}}:{copy?:{eyebrow:string;title:string;body:string};contact?:{address:string;phone:string;email:string};preview?:boolean}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) return;
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
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <div className="contact-details">
          <div><span>VISITANOS</span><p>{contact.address}<br />Resistencia, Chaco</p></div>
          <div><span>ESCRIBINOS</span><p>{contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}<br />{contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}</p></div>
        </div>
      </div>
      <form className="contact-form" onSubmit={submit}>
        <div className="contact-form-head"><span>ENVIANOS UN MENSAJE</span><span aria-hidden="true">✳</span></div>
        <label>Tu nombre<input name="from_name" type="text" required maxLength={100} placeholder="¿Cómo te llamás?" /></label>
        <label>Tu email<input name="reply_to" type="email" required maxLength={254} placeholder="tu@email.com" /></label>
        <label>Tu consulta<textarea name="message" required maxLength={2000} rows={4} placeholder="Contanos en qué podemos ayudarte" /></label>
        <button className="button-primary" type="submit" disabled={busy || preview}>{busy ? 'Enviando…' : 'Enviar mensaje'} <span aria-hidden="true">↗</span></button>
        {status && <p role="status" className="contact-status">{status}</p>}
      </form>
    </section>
  );
}
