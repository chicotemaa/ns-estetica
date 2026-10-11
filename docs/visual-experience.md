# Catálogo visual e imágenes

Campos: `image_url`, `image_gallery` (JSON), `image_position`, `featured`. La API pública los proyecta como `imageUrl`, `gallery`, `imagePosition`, `featured`. Son opcionales en la API del panel para conservar compatibilidad.

El editor reutiliza la carga autenticada de imágenes del sitio: JPG, PNG o WebP de hasta 10 MB, convertidos a WebP en backend. Galería de hasta seis imágenes, URLs HTTPS o rutas locales y encuadre validado. Subir una imagen y guardar el servicio son pasos distintos.

Imagen generada con la herramienta integrada: `public/images/ritual-ambient.webp`. Prompt: fotografía editorial de un frasco ámbar sin marca, crema en cerámica, lino y rama seca, sobre piedra clara, luz cálida lateral y paleta terracota y marfil. Sin texto, logos, personas ni resultados médicos. Se utiliza como ambientación ilustrativa.

Se combinan fotos existentes de faciales, masajes, aparatología y manicura. Se reemplazan desde Servicios → Editar → Imágenes de la web. Las imágenes predeterminadas son ilustrativas.

Segunda imagen generada: `public/images/laser-ambient.webp`. Prompt: fotografía editorial de piernas de una persona adulta sobre una camilla crema, mano sobre la espinilla, toalla y jarrón cálido. Sin texto ni logos. Se identifica como imagen ilustrativa generada en la ficha de depilación.

Verificación local: tipos y lint de web y panel; proyección pública de imágenes y variantes; detalle hacia reserva, descuentos de tres y cuatro zonas y revisión en celular. No se crean turnos ni clientes. La persistencia del editor requiere desplegar primero el esquema del backend. El despliegue se verifica por separado.

La prueba `node tests/integration.js --service-images` en backend usa PostgreSQL desechable y autenticación real. Verifica alta, lectura, edición y retiro de imágenes, proyección pública y conservación de precio y duración. Pasó el 10 de octubre de 2026. La suite general conserva una expectativa antigua de cuatro servicios activos de peluquería que no coincide con el seed actual de estética; esa suite falla antes de estas comprobaciones. Compilaciones de web y panel verificadas; la web se compiló localmente con dos procesos por falta de memoria del equipo, sin cambiar la configuración publicada.
