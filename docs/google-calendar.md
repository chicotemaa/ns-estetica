# Google Calendar del administrador

## Decisiones

- Una conexión por negocio (calendario del local). Solo rol Business Manager. Independiente del acceso Google de los clientes.
- OAuth de servidor con estado aleatorio de un uso ligado al administrador, diez minutos de vigencia y PKCE. Refresh token cifrado con AES-256-GCM; no se expone al panel ni al API genérico.
- Configuración → Google Calendar → Conectar con Google → elegir calendario editable → Activar sincronización.
- Sincronización cada dos minutos y manual. Ventana de consulta completa y paginada: últimos 30 días a próximos 400 días. Instancias recurrentes expandidas. No utiliza webhooks ni promete sincronización instantánea; revisar cuotas si aumenta el volumen.
- Exporta turnos y bloqueos. Título del turno: cliente y servicio; sin correo, teléfono, notas o importe. Eventos privados; no invita clientes. Se aplica el acceso que ya tenga el calendario seleccionado.
- Google → panel: mover modifica fecha/hora/duración; eliminar cancela el turno o quita el bloqueo. Se validan horarios, disponibilidad y protecciones de cobros existentes. Otros eventos ocupados se importan como bloqueos de todo el local sin almacenar sus títulos.
- Agenda: los bloqueos muestran horario y origen, los de jornada completa tienen fila «Todo el día» y tocar un bloqueo abre su día. El detalle diario también los muestra en celular, con acceso a Google Calendar para consultar el evento original. La lista se refresca cada minuto y al recuperar foco; esto consulta los intervalos ya sincronizados y no cambia la frecuencia de sincronización del backend.
- Conflictos: cambios en ambos lados o movimiento inválido no sobrescriben el registro. Aparecen en configuración; se puede corregir Google o elegir conservar el panel. Identificadores deterministas y ETags evitan duplicados y sobrescrituras concurrentes.
- El bloqueo transaccional del negocio coordina sincronización, reservas y tareas de distintas instancias. Una falla mantiene el último estado ocupado conocido y muestra error. El panel sigue siendo utilizable; puede haber demora de disponibilidad si Google falla.
- Desconectar quita credenciales y bloqueos importados. Conserva turnos locales y eventos remotos. Se retienen vínculos para reconectar al mismo calendario sin duplicar. Cambiar de calendario no borra el anterior.

## Configuración inicial del operador técnico

1. Crear/usar un proyecto de Google Cloud y habilitar Google Calendar API.
2. Configurar Google Auth Platform: nombre, correos de soporte, dominios autorizados, audiencia y URLs de privacidad requeridas por Google.
3. Crear cliente OAuth de tipo **Aplicación web** con redirect exacto:
   `https://app.nataliasanchez.com.ar/api/google-calendar/callback`.
4. Autorizar scopes `https://www.googleapis.com/auth/calendar.events` y `https://www.googleapis.com/auth/calendar.calendarlist.readonly`.
5. Configurar solo en el backend Railway: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI` y `GOOGLE_CALENDAR_ENCRYPTION_KEY` (32 bytes aleatorios como 64 caracteres hex). Nunca guardarlos en Git o variables públicas. Respaldar la clave cifrada de manera segura; cambiarla exige reconectar.
6. Desplegar backend antes del panel. Strapi crea `na_calendar_connections`.
7. Para pruebas de OAuth externo, añadir usuarios de prueba. El modo Testing de Google puede expirar refresh tokens a los siete días; para uso estable, publicar la aplicación y completar verificación si Google la exige. No requiere que el cliente entregue su contraseña al panel.

Referencias oficiales: [OAuth servidor](https://developers.google.com/identity/protocols/oauth2/web-server), [eventos](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [sincronización incremental](https://developers.google.com/workspace/calendar/api/guides/sync).

## Verificación y aceptación

- Configuración productiva realizada el 25/10/2026: proyecto Google Cloud `natalia-sanchez-estetica`, Calendar API habilitada, cliente de tipo Aplicación web con el redirect indicado arriba y los dos scopes documentados. Las cuatro variables están configuradas en el servicio backend `ns-estetica` de Railway; el despliegue terminó correctamente. No copiar valores de credenciales a esta documentación.
- El panel productivo muestra «Conectar con Google» y el botón alcanza el selector de cuentas de Google. Política específica publicada en `https://app.nataliasanchez.com.ar/privacidad/google-calendar`, enlazada desde la configuración del panel y desde la marca OAuth. TypeScript y ESLint de los archivos modificados pasaron.
- OAuth publicado en modo «En producción» con confirmación del usuario. Google todavía indica marca y acceso a datos sin verificar: puede mostrar el aviso de app no verificada y aplica el límite de 100 usuarios hasta completar su revisión. Publicar OAuth no equivale a obtener la verificación de Google ni a conectar una cuenta.
- El 26/10/2026 se comprobó la cuenta autorizada, se activó el calendario principal seleccionado y la sincronización manual terminó correctamente con fecha de última sincronización visible y sin errores ni conflictos mostrados. La aceptación detallada de crear/mover/cancelar turnos ficticios en ambos sentidos sigue pendiente.
- Los redirects OAuth y de sesión usan `PANEL_ORIGIN` (origen HTTPS público en producción), sin confiar en el host interno ni cabeceras reenviadas. El fallback productivo es `https://app.nataliasanchez.com.ar`; configurar esta variable al reutilizar el panel en otro dominio. Se verificaron rechazo de protocolos inseguros, credenciales e IP de escucha y funcionamiento local.

- Verificado localmente el 10/10/2026: 36 pruebas unitarias, integración PostgreSQL con API Google simulada, TypeScript, ESLint de archivos modificados y compilación de producción del panel. El intercambio OAuth real y la aceptación en navegador con Google siguen pendientes.
- Pruebas locales con datos ficticios y API Google simulada; ninguna prueba automática debe leer secretos productivos.
- Ejecutar tests del backend, integración PostgreSQL y TypeScript del panel.
- Aceptación productiva pendiente de autorizar una cuenta: conectar una cuenta de prueba desde el botón, seleccionar calendario privado de prueba, crear/mover/cancelar un turno ficticio en ambos sentidos, verificar bloqueo recurrente/día completo, desconectar/reconectar y comprobar que no duplica eventos.
- No marcar conexión real ni sincronización productiva como verificadas únicamente por pasar pruebas locales.
