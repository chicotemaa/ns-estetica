# Animaciones de la home

- Portada: entrada de texto escalonada (750 ms) y foto (1100 ms).
- Secciones y tratamientos: aparición al entrar en pantalla, una sola vez (580 ms).
- Botones, tarjetas, filtros y menú móvil: transiciones breves.
- Sin dependencias adicionales. El contenido permanece visible sin JavaScript.
- Se respeta `prefers-reduced-motion`; el foco de teclado cancela la animación del contenedor. Los importes no se animan.

Verificación local: TypeScript y lint sin errores; navegador con animaciones de portada y menú activas, filtro Facial funcional, sin errores de consola y sin desborde horizontal a 390 px. La preferencia de movimiento reducido se verificó en código, sin emulación del sistema operativo.
