# 📝 Registro de cambios

Todos los cambios relevantes de **Tres Horizontes** se documentan aquí, del más reciente al más antiguo.

---

## [0.3.0] — 2026-11-01 · Seguridad

### 🔐 Seguridad (`backend/server.js`)
- **Límite de intentos por IP:** login 10 cada 15 min, registro 5 por hora, contacto y newsletter 5 por hora, y 120 peticiones por minuto en general. Al pasarse, la API responde `429` con un mensaje claro.
- **El login ya no revela qué emails existen:** siempre responde "Email o contraseña incorrectos." y tarda lo mismo exista o no la cuenta.
- **Validación en el servidor:** nombre, email, contraseña (de 8 a 72 caracteres), fechas, viajeros, notas, mensajes de contacto e identificadores.
- **Los errores internos ya no se muestran:** el detalle se registra en el servidor y el usuario recibe un mensaje genérico.
- **CORS restringido:** en producción solo los dominios de `CORS_ORIGINS`; en desarrollo, `localhost` y `127.0.0.1`.
- **Cabeceras de seguridad:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`, y `Strict-Transport-Security` cuando llega por HTTPS. Además, ya no se anuncia que el servidor es Express.
- **Preparado para HTTPS:** con `NODE_ENV=production` y `TRUST_PROXY=1` redirige todo a HTTPS.
- **JWT reforzado:** algoritmo fijado (HS256) y el servidor no arranca en producción si `JWT_SECRET` falta o tiene menos de 32 caracteres.
- Los cuerpos de las peticiones se limitan a 10 KB, y el JSON mal formado y las rutas inexistentes devuelven errores limpios.

### 🔁 Cambiado
- La contraseña mínima pasa de **6 a 8 caracteres** en el registro. Las cuentas existentes siguen entrando con su contraseña actual.
- Los mensajes de error del servidor ahora están en español.

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
