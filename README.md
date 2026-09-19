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

Se necesitan tres despliegues nuevos para la estética: web, panel y Strapi, más una base PostgreSQL nueva. En el panel, `PANEL_ORIGIN` debe coincidir con su URL HTTPS y `STRAPI_URL` debe ser el backend de estética. En la web, `ESTETICA_BACKEND_URL` debe ser ese mismo backend. En el backend, `CORS_ORIGINS`, `PUBLIC_URL` y `PANEL_ORIGIN` deben reflejar los nuevos dominios. La configuración de la peluquería se mantiene independiente.

No se incluyen credenciales, datos de clientes ni precios reales. Los valores de catálogo inicial son borradores inactivos.
