# 📝 Registro de cambios

Todos los cambios relevantes de **Tres Horizontes** se documentan aquí, del más reciente al más antiguo.

---

## [0.2.0] — 2026-11-01 · Panel del viajero y sistema de animaciones

### ✨ Nuevo

#### Panel del viajero (`frontend/dashboard.html`, `css/dashboard.css`, `js/dashboard.js`)
Después de iniciar sesión, el usuario llega a su panel personal con cuatro secciones:

- **Resumen:** saludo con la fecha, 4 indicadores (reservas activas, próximos viajes, destinos y total reservado), tarjeta de **próximo viaje** con cuenta regresiva y lista de **actividad reciente**.
- **Reservas:** listado con filtros (todas, próximas, pasadas y canceladas), búsqueda por tour o destino, orden por fecha y opción de **cancelar** con diálogo de confirmación.
- **Reservar:** selección de tour, fecha, número de viajeros y notas, con un **resumen en vivo** del precio total.
- **Perfil:** edición de nombre y teléfono, y cierre de sesión.
- Estados cuidados: esqueletos de carga, mensajes cuando no hay datos, errores con botón de **reintentar** y avisos emergentes (toasts).
- En móvil el menú lateral se convierte en una **barra de navegación inferior**.

#### Backend (`backend/server.js`)
- `PATCH /api/bookings/:id/cancel` — cancela una reserva del usuario.
- `PUT /api/users/me` — actualiza nombre y teléfono del perfil.
- El listado de reservas ahora incluye precio, duración e imagen del tour.
- El login devuelve también el teléfono del usuario.
- Al crear una reserva se valida que haya tour y fecha, que la fecha no esté en el pasado y que los viajeros estén entre 1 y 20.
- Solo se pueden cancelar reservas propias que estén pendientes o confirmadas.

#### Sistema de animaciones (`frontend/css/motion.css`)
Una capa de movimiento compartida por la landing y el panel:

- **Transición entre páginas:** al pasar de la landing al panel la página se funde y el logo "viaja" de un header al otro (View Transitions).
- **Títulos de sección:** las palabras suben una a una al aparecer y se dibuja un subrayado dorado bajo la palabra en cursiva.
- **Imágenes en arco:** una cortina se retira para descubrir la foto, y la foto tiene **parallax** al hacer scroll (CSS nativo, sin JavaScript).
- **Botones:** se hunden al pulsar y rebotan al soltar.
- **Menú de la landing:** subraya la sección que está en pantalla.

#### Animaciones del panel
- Las tarjetas entran con un **fundido escalonado** al cargar.
- Una **pastilla se desliza** hasta la sección activa del menú y hasta el filtro elegido.
- Los títulos de cada sección se revelan desde una máscara.
- Los indicadores tienen una **luz que sigue al cursor**.
- La foto del próximo viaje se descubre con una cortina y hace un zoom lento; la cuenta regresiva **sube** hasta los días que faltan.
- El total de la reserva **rebota** cuando cambia.
- Los avisos muestran una **barra con el tiempo** que les queda.

### 🐛 Corregido
- El panel se desplazaba en horizontal en móvil porque los filtros eran más anchos que la pantalla.
- En móvil quedaba un hueco grande sobre el título cuando había poco contenido.

### ♿ Accesibilidad y rendimiento
- Todas las animaciones usan solo `opacity` y `transform`, que las procesa la tarjeta gráfica sin recalcular el diseño.
- Si el sistema tiene activado **"reducir movimiento"**, la web muestra todo directamente sin animar.
- Los títulos animados mantienen su texto completo para los lectores de pantalla.

> 💡 **¿No ves las animaciones?** En Windows revisa *Configuración → Accesibilidad → Efectos visuales → Efectos de animación*. Si está desactivado, el navegador pide "movimiento reducido" y la web no anima.

---

## [0.1.0] · Estado inicial

- Landing page con hero, destinos, valores, tours por categoría, guías, preguntas frecuentes, journal y newsletter.
- Backend en Node.js + Express con PostgreSQL: registro, login con JWT, tours, reservas, contacto y newsletter.
- Separación del HTML, CSS y JavaScript en archivos independientes.
