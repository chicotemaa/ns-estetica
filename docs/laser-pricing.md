# Depilación por zonas

## Reglas acordadas

- Catálogo inicial: las 18 zonas y precios del flyer de Natalia Estética.
- Cada zona se elige una vez; desde 3 zonas se aplica 20% al subtotal.
- «Todo el cuerpo» incluye las 18 filas, según la indicación «seguir la lista», y aplica 30%, sin acumular el 20%. Subtotal inicial: $186.000; total: $130.200.
- El administrador define fechas puntuales o días semanales, horario y duración fija del turno desde Servicios. Las jornadas respetan además el horario del negocio, profesionales y bloqueos.
- Cierre inicial de reservas: 24 horas antes del comienzo del turno. El administrador puede editarlo.
- Se puede publicar la lista y calcular precios sin habilitar turnos. Para habilitar reservas se exige jornada, horario y duración; no se inventan fechas.

## Implementación

`zone_pricing` guarda catálogo, promociones y jornadas en el servicio. La web consulta la cotización al backend y envía el total mostrado; el backend vuelve a calcularlo y rechaza una reserva si el importe cambió. Los descuentos se calculan en centavos.

El turno guarda `zone_selection` y `pricing_snapshot` con líneas, subtotal, porcentaje, descuento y total. Cambiar precios del servicio no altera reservas anteriores. Si se cambian las zonas de un turno, se cotiza nuevamente; si ya tiene atención o cobros registrados, no se permiten cambios de zonas.

En Servicios, «Usar lista de depilación láser» carga la plantilla en el formulario. El endpoint privado `POST /api/backoffice/service-presets/laser` permite instalarla sin duplicar un servicio con el mismo nombre ni sobrescribirlo. El servicio se crea activo, con reservas deshabilitadas hasta la configuración del administrador.

## Verificación local

- Tests unitarios: umbral de descuento, paquete completo, selecciones inválidas, jornada y corte de 24 horas.
- Integración con PostgreSQL temporal: permisos, instalación idempotente, reservas bloqueadas sin jornada, cotización, rechazo de importes manipulados, persistencia del detalle, conservación de precios históricos y cálculo desde el administrador.
- Las pruebas usan exclusivamente datos ficticios. La aceptación productiva se verifica por separado, sin crear turnos de prueba reales.
