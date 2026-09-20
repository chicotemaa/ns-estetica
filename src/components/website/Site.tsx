'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, type CSSProperties } from 'react';
import { defaultWebsite, type WebsiteContent } from '@/lib/website-content';
import type { SiteCatalog } from '@/lib/public-site';
import Booking from '../booking/Booking';
import ServiceCatalog from '../services/ServiceCatalog';
import ContactForm from '../contact/ContactForm';

const panelOrigins = ['https://app.nataliasanchez.com.ar','https://mi-comercio-estetica-production.up.railway.app'];
const fallbackContact = {address:'Wilde 12, local 1, planta baja',phone:'+543624654117',email:'nabrizka@hotmail.com',instagramHandle:'natalias.estetica',whatsappPhone:''};
function videoEmbed(raw: string) {
  try { const u=new URL(raw); if (['youtube.com','www.youtube.com','youtu.be'].includes(u.hostname)) { const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v'); if (/^[\w-]{11}$/.test(id || '')) return 'https://www.youtube-nocookie.com/embed/'+id; } if (['vimeo.com','www.vimeo.com'].includes(u.hostname)&&/^\/\d+$/.test(u.pathname)) return 'https://player.vimeo.com/video'+u.pathname; } catch {}
  return null;
}
export default function Site({initial,catalog}:{initial:WebsiteContent;catalog:SiteCatalog}) {
  const [content,setContent]=useState(initial),[menu,setMenu]=useState(false),[preview,setPreview]=useState(false);
  const [chosenService, setChosenService] = useState<{id:string} | null>(null);
  const contact={...fallbackContact,...Object.fromEntries(Object.entries(catalog.brand || {}).filter(([,v])=>v!==null && v!==undefined))};
  useEffect(()=>{
    if (new URLSearchParams(location.search).get('editorPreview')!=='1'||window.parent===window) return;
    setPreview(true);
    function receive(e:MessageEvent) {
      if (!panelOrigins.includes(e.origin)||e.source!==window.parent||e.data?.type!=='nerea:preview') return;
      const draft=e.data.content;
      if (!draft || Object.keys(defaultWebsite).some(key=>!draft[key]||typeof draft[key]!=='object')) return;
      setContent(Object.fromEntries(Object.entries(defaultWebsite).map(([key,value])=>[key,{...value,...draft[key]}])) as WebsiteContent);
    }
    window.addEventListener('message',receive);
    panelOrigins.forEach(origin=>window.parent.postMessage({type:'nerea:ready'},origin));
    return ()=>window.removeEventListener('message',receive);
  },[]);
  const c=content;
  const style={'--ink':c.identity.black,'--cream':c.identity.gray,'--paper':c.identity.white,'--rose-dark':c.identity.burgundy, color:c.identity.black,background:c.identity.white,fontFamily:c.identity.font==='system'?'system-ui, sans-serif':undefined} as CSSProperties;
  const links=[...(c.services.enabled?[{href:'#services',label:c.navigation.services}]:[]),...(c.about.enabled?[{href:'#about',label:c.navigation.about}]:[]),...(c.work.enabled?[{href:'#gallery',label:c.navigation.work}]:[]),...(c.journal.enabled?[{href:'#journal',label:c.navigation.journal}]:[]),{href:'#contact',label:'Contacto'}];
  const photoSection=(section:typeof c.brand,id:string)=><section id={id} className="section-pad"><p className="eyebrow">{section.eyebrow}</p><h2 className="editable-title">{section.title}</h2><p className="editable-copy">{section.body}</p><div className="service-grid">{section.photos.map(p=><figure key={p.id}><div className="service-photo"><img src={p.image} alt={p.alt} className="cover-image" loading="lazy" /></div><figcaption><h3>{p.title}</h3><p>{p.description}</p></figcaption></figure>)}</div>{section.credit&&<p>{section.credit}</p>}</section>;
  return <div style={style} className={c.identity.rounded?'editable-site rounded-site':'editable-site'}>
    {preview&&<div className="preview-banner" role="status">Vista previa · Borrador sin publicar</div>}
    <header className="site-header"><div className="site-header-inner">
      <a className="brand" href="#inicio" aria-label={c.identity.name+', inicio'}><img src={c.identity.logo} alt={c.identity.name} width={66} height={48} className="brand-logo" /><span className="brand-name">{c.identity.shortName}<small>{c.navigation.topbar}</small></span></a>
      <nav className={menu?'nav-links is-open':'nav-links'} aria-label="Navegación principal">{links.map(l=><a key={l.href} href={l.href} onClick={()=>setMenu(false)}>{l.label}</a>)}<a href="/cuenta">Mi cuenta</a></nav>
      <a href="#reservas" className="header-book">{c.navigation.booking} ↗</a><button className="menu-toggle" type="button" aria-label={menu?'Cerrar menú':'Abrir menú'} aria-expanded={menu} onClick={()=>setMenu(!menu)}><span/><span/></button>
    </div></header>
    <main>
      <section id="inicio" className="hero"><div className="hero-copy"><p className="eyebrow">{c.hero.eyebrow}</p><h1 className="editable-lines">{c.hero.title.split('\n')[0]}{c.hero.title.includes('\n')&&<><br/><em>{c.hero.title.split('\n').slice(1).join('\n')}</em></>}</h1><p className="hero-description">{c.hero.note}</p><div className="hero-actions"><a className="button-primary" href="#reservas">{c.hero.buttonText} ↗</a><a className="text-link" href="#services">{c.hero.secondaryText} →</a></div><p className="hero-footnote">{c.hero.signature}</p></div><div className="hero-visual"><div className="hero-image-wrap"><img src={c.hero.image} alt={c.hero.alt} className="cover-image" fetchPriority="high" /></div><span className="hero-outline" aria-hidden="true">NS</span></div></section>
      {c.services.enabled&&<ServiceCatalog services={catalog.services} title={c.services.title} onChoose={id => setChosenService({id})}/>}
      {c.about.enabled&&<section id="about" className="about-section section-pad"><div className="about-visual"><div className="about-photo"><img src={c.about.image} alt={c.about.alt} className="cover-image" loading="lazy"/></div><span className="about-caption">{c.about.caption}</span></div><div className="about-copy"><p className="eyebrow">{c.about.eyebrow}</p><h2 className="editable-lines">{c.about.title}</h2><p className="editable-lines">{c.about.body}</p><a href="#contact" className="text-link">{c.about.buttonText} →</a></div></section>}
      {c.work.enabled&&<section className="section-pad"><p className="eyebrow">{c.work.eyebrow}</p><h2 className="editable-title">{c.work.title}</h2><div className="service-grid">{c.gallery.photos.slice(0,4).map(p=><figure key={p.id}><div className="service-photo"><img src={p.image} alt={p.alt} className="cover-image" loading="lazy"/></div><figcaption>{p.title}</figcaption></figure>)}</div><a href="#gallery" className="text-link">{c.work.linkText} →</a></section>}
      {c.gallery.photos.length>0&&photoSection({...c.gallery,enabled:true,credit:''},'gallery')}
      {c.brand.enabled&&photoSection(c.brand,'brand')}
      {c.journal.enabled&&<section id="journal" className="section-pad"><p className="eyebrow">{c.journal.eyebrow}</p><h2 className="editable-title">{c.journal.title}</h2><p>{c.journal.body}</p><div className="service-grid">{c.journal.posts.map(p=><article key={p.id}><h3>{p.title}</h3><p>{p.excerpt}</p><details><summary>Leer nota</summary><p className="editable-lines">{p.content}</p></details></article>)}</div></section>}
      {c.videos.enabled&&<section className="section-pad"><p className="eyebrow">{c.videos.eyebrow}</p><h2 className="editable-title">{c.videos.title}</h2><div className="service-grid">{c.videos.items.map(v=><article key={v.id}><h3>{v.title}</h3>{videoEmbed(v.url)?<iframe className="site-video" src={videoEmbed(v.url)!} title={v.title} loading="lazy" allowFullScreen/>:<video className="site-video" src={v.url} poster={v.poster||undefined} controls preload="none"/>}<p>{v.description}</p></article>)}</div></section>}
      {c.experience.enabled&&<section className="experience-section section-pad"><div className="experience-top"><div><p className="eyebrow">{c.experience.eyebrow}</p><h2>{c.experience.title}</h2></div><p>{c.experience.body}</p></div><div className="experience-grid">{c.experience.steps.map((step,i)=><article key={step.id} className="experience-step"><span>{String(i+1).padStart(2,'0')}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></article>)}</div></section>}
      {c.visit.enabled&&<section id="workinfo" className="experience-section section-pad"><p className="eyebrow">{c.visit.eyebrow}</p><h2 className="editable-title">{c.visit.title}</h2><p className="editable-lines">{c.visit.body}</p><div className="location-strip"><span>VISITANOS</span><p>{contact.address}</p><a href="#reservas">{c.visit.buttonText} ↗</a></div></section>}
      <Booking chosenService={chosenService} title={c.booking.title} intro={c.booking.intro} preview={preview}/>
      <ContactForm contact={contact} preview={preview} copy={c.contact}/>
    </main>
    <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><img src={c.identity.logo==='/images/LOGO.png'?'/images/LOGO-1.png':c.identity.logo} alt={c.identity.name} width={92} height={92}/><p>{c.identity.shortName}<span>{c.navigation.topbar}</span></p></div><p className="footer-statement">{c.footer.description}</p><div className="footer-links">{links.map(l=><a key={l.href} href={l.href}>{l.label}</a>)}<a href="#reservas">{c.footer.bookingText}</a><a href="/cuenta">Mi cuenta</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {c.identity.name}</span><span>{contact.address}</span>{/^[\w.]{1,30}$/.test(contact.instagramHandle)&&<a href={'https://instagram.com/'+contact.instagramHandle} target="_blank" rel="noopener noreferrer">Instagram ↗</a>}{/^[1-9]\d{7,14}$/.test(contact.whatsappPhone)&&<a href={'https://wa.me/'+contact.whatsappPhone}>WhatsApp ↗</a>}</div></footer>
  </div>;
}

