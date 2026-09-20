# Natalia Sánchez Estética

La web pública conserva la presentación de la estética y suma solicitudes de turno. El proyecto incluye una instancia independiente del backend Strapi y una copia de Mi Comercio para gestionar servicios, profesionales, agenda, clientes y caja.

```text
Web pública (Next.js) ───────┐
                             ├── backend/ (Strapi) ── PostgreSQL exclusivo de estética
Mi Comercio (panel/) ────────┘

Peluquería: otros despliegues de web, panel, Strapi y PostgreSQL.
```

## Configuración local

Se requiere Node.js 22.22.2 y PostgreSQL. Cada aplicación tiene su propio `package.json`.

1. Crear una base PostgreSQL vacía y exclusiva para la estética. No reutilizar la base de la peluquería.
2. Copiar `backend/.env.example` a `backend/.env`. Definir `ESTETICA_DATABASE_URL` y generar secretos nuevos para todas las variables de Strapi. `BUSINESS_SLUG` debe ser `natalia-sanchez-estetica`.
3. Instalar dependencias y ejecutar Strapi desde `backend/` (`npm ci`, `npm run develop`). Para crear el negocio inicial una sola vez, definir temporalmente `SEED_BUSINESS=true` y reiniciar. Los servicios se crean inactivos y sin precio hasta revisarlos en el panel.
4. Crear en Strapi un usuario con el rol **Business Manager**. El registro público de cuentas está deshabilitado.
5. Copiar `panel/.env.example` a `panel/.env.local`; definir `STRAPI_URL` con el backend de estética, `BUSINESS_SLUG=natalia-sanchez-estetica` y `PANEL_ORIGIN` con el origen del panel. Instalar y ejecutar `npm ci` y `npm run dev -- -p 3001` desde `panel/`.
6. Copiar `.env.example` a `.env.local`; definir `ESTETICA_BACKEND_URL` con el mismo backend de estética. Instalar y ejecutar la web (`npm ci`, `npm run dev`).
7. Revisar precios, duración, profesionales, horarios y marca en Mi Comercio; activar los servicios cuando estén listos.

La web usa `/api/reservas/*` como intermediario. Sólo admite catálogo, disponibilidad y creación de reservas para el slug de la estética. La validación de cupos, precios y conflictos ocurre en Strapi.

## Publicación

La instancia de producción de estética está en el proyecto Railway `ns-estetica` (`153ff1ad-b6cc-4b1f-8666-ad51f82c8a86`), con PostgreSQL propio, servicio `ns-estetica` para Strapi y servicio `mi-comercio-estetica` para el panel. Ambos usan la rama `codex/estetica-mi-comercio` de este repositorio y las raíces `/backend` y `/panel`, respectivamente. El backend responde en `https://ns-estetica-production.up.railway.app` y el panel tiene la URL temporal `https://mi-comercio-estetica-production.up.railway.app`.

El dominio real en Vercel es `nataliasanchez.com.ar`. La web pública está publicada en el proyecto Vercel `ns-estetica`, desde la rama `main`, en `www.nataliasanchez.com.ar`, con `ESTETICA_BACKEND_URL=https://ns-estetica-production.up.railway.app`. El panel está operativo en `https://app.nataliasanchez.com.ar`, con HTTPS de Railway. El DNS se administra en Vercel: el CNAME `app` apunta a `xc5kasbf.up.railway.app`, con su TXT de verificación de Railway y autorización CAA para Let's Encrypt. La URL temporal sigue disponible como acceso alternativo.

La dirección confirmada del negocio es **Wilde 12, local 1, planta baja**, en Resistencia, Chaco; está publicada en la web y guardada en la configuración del panel.

Las variables `PANEL_ORIGIN`, `STRAPI_URL`, `PUBLIC_URL`, `CORS_ORIGINS` y `BUSINESS_SLUG` están configuradas para la instancia de estética. Los servicios iniciales permanecen inactivos y sin precio; revisar catálogo, profesionales y horarios antes de abrir las reservas públicas. La configuración de la peluquería se mantiene independiente.

No se incluyen credenciales, datos de clientes ni precios reales. Los valores de catálogo inicial son borradores inactivos.

## Edición de la web y cuentas de clientes

`Mi web` administra portada, tratamientos destacados, presentación, experiencia, galería, notas, videos, contacto y pie de página. Guardar conserva un borrador privado; Publicar actualiza el contenido que la web consulta sin caché. La vista previa acepta mensajes únicamente del panel de Natalia y del acceso alternativo autorizado. Dirección, teléfono y redes se toman de Configuración. Los precios siguen administrándose en Servicios.

El backend tiene un volumen Railway montado en `/app/public/uploads` para conservar los archivos del editor entre despliegues.

La página `/cuenta` permite ingresar con un código por email y editar nombre y teléfono. Las solicitudes de turno siguen disponibles sin cuenta. El intermediario `/api/cuenta/*` permite únicamente configuración, códigos, sesión y perfil; no publica rutas de pagos o reservas autenticadas. Vercel necesita `CUSTOMER_PROXY_SECRET` con el mismo valor privado del backend. La sesión se guarda exclusivamente en una cookie HttpOnly.

El remitente elegido es `info@nataliasanchez.com.ar` y las respuestas van a `nabrizka@hotmail.com`. Cloudflare Email Sending requiere la cuenta y el dominio habilitados, `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_EMAIL_API_TOKEN`. El remitente se guarda desde Configuración → Reservas online. `NOTIFICATION_EMAIL_REPLY_TO` permite cambiar el destino de las respuestas. Hasta validar Cloudflare y comprobar un envío real, el acceso por correo permanece pendiente de activación.
