#🇨🇴 Colombia Travel Experience

## 📌 Descripción del proyecto

**Colombia Travel Experience** es una plataforma web responsive, (ENG), diseñada para atraer turistas de Estados Unidos interesados en conocer Colombia de una manera segura, confiable y organizada.

El objetivo principal es presentar diferentes destinos turísticos de Colombia, mostrar experiencias y paquetes de viaje, permitir que los usuarios conozcan opiniones de otros viajeros y facilitar el contacto con asesores para resolver dudas o agendar servicios.

La plataforma estará disponible para dispositivos **desktop y móviles**, buscando ofrecer una experiencia sencilla, moderna y confiable.

---

## 🎯 Objetivo general

Crear una página web que permita a turistas de Estados Unidos descubrir y conocer diferentes destinos turísticos de Colombia, consultar paquetes y experiencias, registrarse, solicitar información y contactar a un asesor a través de canales oficiales.

---

## 🌎 Público objetivo

El proyecto está principalmente dirigido a:

- Turistas de Estados Unidos interesados en viajar a Colombia.
- Personas que buscan experiencias culturales, naturales y de aventura.
- Viajeros que necesitan información clara antes de organizar su viaje.
- Personas que prefieren contar con asesoría para planificar sus experiencias.

---

## 🏞️ Destinos turísticos

La plataforma podrá presentar diferentes destinos de Colombia, entre ellos:

- 🌿 Amazonas
- ⛰️ Mavecure / Cerros de Mavecure
- 🌊 Nuquí, Chocó
- 🏝️ Parque Nacional Natural Tayrona
- 🌴 Santa Marta
- 🏙️ Cartagena
- ☕ Eje Cafetero
- 🏔️ Otros destinos turísticos de Colombia

Cada destino podrá contar con información como:

- Descripción del lugar.
- Fotografías.
- Actividades disponibles.
- Duración aproximada.
- Recomendaciones.
- Paquetes relacionados.
- Información para contactar a un asesor.

---

## 💻 Funcionalidades principales

### 1. Página de presentación

La página principal tendrá una presentación atractiva de Colombia y de las experiencias disponibles.

Podrá incluir:

- Imagen principal o sección Hero.
- Mensaje de bienvenida.
- Propuesta de valor.
- Destinos destacados.
- Botones para explorar paquetes o contactar a un asesor.

### 2. Paquetes turísticos

Los usuarios podrán consultar diferentes paquetes turísticos.

Cada paquete puede mostrar:

- Nombre del paquete.
- Destino.
- Duración.
- Actividades.
- Servicios incluidos.
- Precio o rango de precio.
- Galería de imágenes.
- Botón para solicitar información o agendar.

### 3. Opiniones de viajeros

Se incluirá una sección donde los usuarios puedan consultar experiencias y opiniones de otros viajeros.

Ejemplo:

> "Colombia exceeded my expectations. The experience in Tayrona was incredible and the organization of the trip made everything easier."

Esta sección busca generar confianza antes de realizar una reserva.

### 4. Registro de usuarios

La plataforma podrá permitir que los usuarios creen una cuenta utilizando información básica como:

- Nombre.
- Apellido.
- Correo electrónico.
- País.
- Contraseña.

### 5. Agendamiento de servicios

Los usuarios podrán solicitar o agendar una experiencia mediante un formulario.

El formulario podrá solicitar:

- Nombre.
- Correo electrónico.
- Destino.
- Paquete de interés.
- Fecha tentativa.
- Número de viajeros.
- Comentarios o necesidades especiales.

### 6. Contacto con un asesor

Los usuarios podrán comunicarse con un asesor mediante los canales oficiales definidos por el proyecto.

La página podrá incluir:

- Correo electrónico.
- WhatsApp.
- Formulario de contacto.
- Redes sociales oficiales.

> Los datos reales de contacto se agregarán cuando sean definidos por el equipo.

---

## 📱 Diseño responsive

La aplicación será diseñada para funcionar correctamente en:

- 📱 Celulares.
- 📲 Tablets.
- 💻 Computadores portátiles.
- 🖥️ Computadores de escritorio.

Se buscará aplicar un diseño **responsive**, de manera que la interfaz se adapte al tamaño de la pantalla del usuario.

---

## 🛠️ Tecnologías

### Frontend

- HTML5, CSS3 y JavaScript (sin frameworks)
- Animaciones con CSS nativo: View Transitions y animaciones ligadas al scroll
- Iconos: Phosphor Icons · Tipografías: Geist e Instrument Serif

### Backend

- Node.js + Express
- PostgreSQL (`pg`)
- Autenticación con JWT (`jsonwebtoken`) y contraseñas cifradas (`bcryptjs`)

### Control de versiones y desarrollo

- Git y GitHub
- Visual Studio Code

---

## 📂 Estructura del proyecto

```text
3H/
├── README.md
├── CHANGELOG.md            ← registro de cambios
│
├── frontend/
│   ├── index.html          ← landing page
│   ├── dashboard.html      ← panel del viajero (tras iniciar sesión)
│   ├── css/
│   │   ├── style.css       ← estilos base y landing
│   │   ├── dashboard.css   ← estilos del panel
│   │   └── motion.css      ← sistema de animaciones compartido
│   ├── js/
│   │   ├── main.js         ← landing: modales, tours, animaciones de scroll
│   │   └── dashboard.js    ← panel: reservas, perfil, animaciones
│   └── img/
│
└── backend/
    ├── server.js           ← API REST (Express)
    ├── routes/
    ├── data/
    └── .env                ← variables locales (no se sube a GitHub)
```

---

## ▶️ Cómo ejecutarlo

**1. Backend** — crea `backend/.env` con estas variables:

```text
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
JWT_SECRET=        # mínimo 32 caracteres
PORT=5000

# Solo en producción:
# NODE_ENV=production
# CORS_ORIGINS=https://tu-dominio.com     (dominios permitidos, separados por comas)
# TRUST_PROXY=1                          (si va detrás de un proxy HTTPS: Render, Railway, Nginx…)
```

Para generar un `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```bash
cd backend
npm install
npm run dev
```

**2. Frontend** — sírvelo con cualquier servidor estático, por ejemplo:

```bash
cd frontend
npx serve .
```

Y abre la dirección que indique la terminal. Es mejor usar un servidor que abrir el archivo directamente, porque así funcionan las transiciones entre páginas.

### Endpoints principales de la API

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/tours` | Listar tours |
| GET / POST | `/api/bookings` | Ver y crear reservas (requiere sesión) |
| PATCH | `/api/bookings/:id/cancel` | Cancelar una reserva |
| PUT | `/api/users/me` | Editar perfil |
| POST | `/api/contact` · `/api/newsletter` | Contacto y suscripción |

---

## 🔀 Trabajo colaborativo con Git y GitHub

El proyecto será desarrollado de manera colaborativa utilizando **Git y GitHub**.

Cada integrante podrá trabajar en una rama independiente para evitar modificar directamente el código principal.

### Flujo básico de trabajo

```bash
git clone URL_DEL_REPOSITORIO
```

Crear una rama:

```bash
git checkout -b nombre-de-la-funcionalidad
```

Consultar los cambios:

```bash
git status
```

Agregar los cambios:

```bash
git add .
```

Crear un commit:

```bash
git commit -m "Descripción del cambio"
```

Subir la rama:

```bash
git push origin nombre-de-la-funcionalidad
```

Después de esto, se podrá crear un **Pull Request** en GitHub para revisar e integrar los cambios.

---

## 👥 Organización inicial del equipo

El proyecto será desarrollado inicialmente por (X) integrantes.

Cada integrante podrá encargarse de diferentes funcionalidades. Por ejemplo:

### Integrante 1

- Página principal.
- Diseño visual.
- Sección de destinos.
- Responsive design.

### Integrante 2

- Paquetes turísticos.
- Formularios.
- Registro de usuarios.
- Contacto y agendamiento.

La distribución podrá modificarse según las necesidades del proyecto.

---

## 🚀 Próximas etapas

1. Crear el repositorio en GitHub.
2. Crear la estructura inicial del proyecto.
3. Diseñar la página principal.
4. Crear la sección de destinos.
5. Crear los paquetes turísticos.
6. Implementar opiniones.
7. Crear formularios de registro y contacto.
8. Crear el sistema de agendamiento.
9. Mejorar el diseño responsive.
10. Implementar funcionalidades backend.
11. Conectar una base de datos.
12. Implementar autenticación.
13. Realizar pruebas.
14. Publicar la aplicación.

---

## 🔐 Confianza y seguridad

Uno de los objetivos principales del proyecto es transmitir confianza a los turistas.

Por esta razón, la plataforma deberá:

- Presentar información clara sobre los servicios.
- Utilizar canales oficiales de contacto.
- Proteger los datos de los usuarios.
- Evitar solicitar información innecesaria.
- Utilizar conexiones HTTPS cuando el proyecto sea publicado.
- Mostrar condiciones y políticas de los servicios cuando corresponda.

---

## 📄 Estado del proyecto

🚧 **Proyecto en desarrollo**

**Versión actual: 0.3.0**

Ya están listos:

- ✅ Landing page completa y responsive.
- ✅ Registro e inicio de sesión de usuarios.
- ✅ Panel del viajero: resumen, reservas, nueva reserva y perfil.
- ✅ Cancelación de reservas y edición de perfil.
- ✅ Sistema de animaciones en toda la web.
- ✅ Seguridad: límite de intentos, validación, errores ocultos, CORS y cabeceras.

Próximos pasos: opiniones de viajeros, contacto con asesor y publicación.

👉 El detalle de cada cambio está en el [**CHANGELOG**](CHANGELOG.md).

---

## 🤝 Contribuciones

Este proyecto es desarrollado inicialmente como un trabajo colaborativo de aprendizaje.

Para realizar cambios:

1. Crear una rama.
2. Realizar los cambios.
3. Crear un commit.
4. Subir la rama a GitHub.
5. Crear un Pull Request.
6. Revisar los cambios con el otro integrante.
7. Integrar los cambios a la rama principal.

---

## 📬 Contacto

Los canales oficiales de contacto serán agregados posteriormente.

- Email: Por definir
- WhatsApp: Por definir
- Instagram: Por definir
- Sitio web: En desarrollo

---

## 🇨🇴 Discover Colombia

**Colombia Travel Experience — Discover Colombia, live the experience.**

Un proyecto enfocado en conectar viajeros internacionales con las experiencias, paisajes y destinos naturales y culturales de Colombia para impulsar el desarrollo economico y turismo Colombiano.
