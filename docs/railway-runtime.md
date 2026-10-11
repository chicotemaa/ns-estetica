# Arranque del backend en Railway

El contenedor ejecuta directamente el CLI de Strapi con Node. No debe arrancar con `npm start`: npm como proceso principal recibe SIGTERM al reemplazar el despliegue y puede registrar el cierre como fallo, generando alertas de «Deployment crashed» aunque la nueva instancia esté sana.

Strapi tiene su propio manejador de SIGTERM: cierra servidor, plugins y conexiones a la base de datos antes de salir. Se conserva la comprobación de salud `/_health` y la política de reinicio ante fallos reales.

El 11 de octubre de 2026, el despliegue anterior terminó con `npm error signal SIGTERM` durante su reemplazo. La instancia nueva arrancó correctamente y devolvió 200 en el catálogo público. La corrección elimina el intermediario npm; se verifica en Railway el arranque y el cierre durante un reemplazo controlado.
