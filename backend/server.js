require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ===== CONFIGURACIÓN SEGURA =====
// Sin un secreto largo cualquiera podría falsificar sesiones
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  const msg = 'JWT_SECRET debe existir y tener al menos 32 caracteres (genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))")';
  if (isProd) { console.error(`✗ ${msg}`); process.exit(1); }
  console.warn(`⚠ ${msg}`);
}

// Detrás de un proxy HTTPS (Render, Railway, Nginx…) pon TRUST_PROXY=1 para
// que req.ip y req.secure sean los del visitante real
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

app.disable('x-powered-by'); // no anunciar que el servidor es Express

// ===== CABECERAS DE SEGURIDAD =====
// Equivalente mínimo a "helmet" para una API que solo devuelve JSON
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Cache-Control': 'no-store'
  });
  // HSTS: obliga al navegador a usar siempre HTTPS (solo si ya llegó por HTTPS)
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// En producción detrás de un proxy HTTPS, redirige cualquier petición HTTP a
// HTTPS (sin TRUST_PROXY, req.secure sería siempre false y entraría en bucle)
if (isProd && process.env.TRUST_PROXY === '1') {
  app.use((req, res, next) => {
    if (req.secure) return next();
    res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
  });
}

// ===== CORS =====
// Solo los orígenes de CORS_ORIGINS (separados por comas) pueden llamar a la API.
// En desarrollo se permite además localhost / 127.0.0.1 en cualquier puerto.
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // herramientas como curl o peticiones del mismo origen
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (!isProd && (LOCAL_ORIGIN.test(origin) || origin === 'null')) return cb(null, true);
    return cb(null, false); // sin cabeceras CORS: el navegador bloquea la respuesta
  }
}));

app.use(express.json({ limit: '10kb' })); // cuerpos pequeños: evita abusos

// ===== LÍMITE DE INTENTOS =====
// Ventana fija por IP, en memoria. Suficiente para un único servidor; si algún
// día hay varios, habría que guardarlo en Redis o similar.
function rateLimit({ windowMs, max, message = 'Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.' }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    let entry = hits.get(req.ip);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(req.ip, entry);
    }
    entry.count++;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

const MIN = 60 * 1000;
const loginLimiter = rateLimit({ windowMs: 15 * MIN, max: 10, message: 'Demasiados intentos de inicio de sesión. Espera 15 minutos y vuelve a intentarlo.' });
const registerLimiter = rateLimit({ windowMs: 60 * MIN, max: 5, message: 'Demasiados registros desde esta conexión. Inténtalo más tarde.' });
const formLimiter = rateLimit({ windowMs: 60 * MIN, max: 5, message: 'Has enviado demasiados formularios. Inténtalo más tarde.' });
app.use('/api', rateLimit({ windowMs: MIN, max: 120 })); // límite general

// ===== VALIDACIÓN Y ERRORES =====
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const isId = (v) => /^\d{1,10}$/.test(String(v));

// Nunca se envía el error interno al cliente: se registra en el servidor y el
// usuario recibe un mensaje genérico. Los errores de datos de Postgres
// (códigos 22xxx y 23xxx) se tratan como petición inválida.
function fail(res, err) {
  console.error(err);
  if (err && typeof err.code === 'string' && /^2[23]/.test(err.code)) {
    return res.status(400).json({ error: 'Los datos enviados no son válidos.' });
  }
  res.status(500).json({ error: 'Error interno del servidor. Inténtalo de nuevo más tarde.' });
}

// ===== DATABASE CONNECTION =====
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => console.error('Database error:', err));

// ===== INITIALIZE DATABASE =====
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tours (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2),
        duration INT,
        category VARCHAR(50),
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        tour_id INT REFERENCES tours(id) ON DELETE CASCADE,
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        travel_date DATE,
        guests INT,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS newsletter (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Database initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

// ===== AUTH MIDDLEWARE =====
const verifyToken = (req, res, next) => {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'No token provided' });

  // Se fija el algoritmo para que no se acepten tokens firmados de otra forma
  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
};

const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

// Hash de relleno: el login tarda lo mismo exista o no el email, para que no
// se pueda averiguar qué cuentas existen midiendo el tiempo de respuesta
const DUMMY_HASH = bcrypt.hashSync('tres-horizontes-relleno', 10);

// ===== ROUTES =====

// REGISTER
app.post('/api/auth/register', registerLimiter, async (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!name || name.length > 100) return res.status(400).json({ error: 'Escribe tu nombre (máximo 100 caracteres).' });
  if (!EMAIL_RE.test(email) || email.length > 255) return res.status(400).json({ error: 'Escribe un email válido.' });
  // bcrypt solo usa los primeros 72 bytes: por encima se ignoraría el resto
  if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 72 caracteres.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );
    res.status(201).json({ user: result.rows[0], token: signToken(result.rows[0].id) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ese email ya tiene una cuenta. Inicia sesión.' });
    fail(res, err);
  }
});

// LOGIN
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const email = str(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  // Mismo mensaje tanto si el email no existe como si la contraseña falla
  const invalid = () => res.status(401).json({ error: 'Email o contraseña incorrectos.' });

  if (!email || !password) return invalid();

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !validPassword) return invalid();

    res.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone }, token: signToken(user.id) });
  } catch (err) {
    fail(res, err);
  }
});

// GET TOURS
app.get('/api/tours', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tours ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    fail(res, err);
  }
});

// GET TOUR BY ID
app.get('/api/tours/:id', async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ error: 'Identificador no válido.' });
  try {
    const result = await pool.query('SELECT * FROM tours WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || {});
  } catch (err) {
    fail(res, err);
  }
});

// CREATE BOOKING (protected)
app.post('/api/bookings', verifyToken, async (req, res) => {
  const { tour_id, travel_date, guests } = req.body;
  const notes = str(req.body.notes);
  const n = Number(guests);

  if (!isId(tour_id) || !DATE_RE.test(String(travel_date || ''))) return res.status(400).json({ error: 'Elige un tour y una fecha válidos.' });
  if (!Number.isInteger(n) || n < 1 || n > 20) return res.status(400).json({ error: 'El número de viajeros debe estar entre 1 y 20.' });
  if (new Date(`${travel_date}T00:00:00`) < new Date(new Date().toDateString())) return res.status(400).json({ error: 'La fecha de salida no puede estar en el pasado.' });
  if (notes.length > 500) return res.status(400).json({ error: 'Las notas no pueden superar los 500 caracteres.' });

  try {
    const result = await pool.query(
      'INSERT INTO bookings (user_id, tour_id, travel_date, guests, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, tour_id, travel_date, n, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Ese tour no existe.' });
    fail(res, err);
  }
});

// GET USER BOOKINGS (protected)
app.get('/api/bookings', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, t.name, t.destination, t.price, t.duration, t.category, t.image_url
         FROM bookings b JOIN tours t ON b.tour_id = t.id
        WHERE b.user_id = $1
        ORDER BY b.booking_date DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    fail(res, err);
  }
});

// CANCEL BOOKING (protected, solo reservas propias y pendientes/confirmadas)
app.patch('/api/bookings/:id/cancel', verifyToken, async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ error: 'Identificador no válido.' });
  try {
    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled'
        WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'confirmed')
        RETURNING *`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontramos esa reserva o ya no se puede cancelar.' });
    res.json(result.rows[0]);
  } catch (err) {
    fail(res, err);
  }
});

// UPDATE PROFILE (protected)
app.put('/api/users/me', verifyToken, async (req, res) => {
  const name = str(req.body.name);
  const phone = str(req.body.phone);
  if (!name || name.length > 100) return res.status(400).json({ error: 'Escribe tu nombre (máximo 100 caracteres).' });
  if (phone.length > 20) return res.status(400).json({ error: 'El teléfono no puede superar los 20 caracteres.' });

  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING id, email, name, phone',
      [name, phone || null, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    fail(res, err);
  }
});

// CONTACT FORM
app.post('/api/contact', formLimiter, async (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const message = str(req.body.message);

  if (!name || name.length > 100) return res.status(400).json({ error: 'Escribe tu nombre (máximo 100 caracteres).' });
  if (!EMAIL_RE.test(email) || email.length > 255) return res.status(400).json({ error: 'Escribe un email válido.' });
  if (!message || message.length > 2000) return res.status(400).json({ error: 'El mensaje debe tener entre 1 y 2000 caracteres.' });

  try {
    await pool.query(
      'INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)',
      [name, email, message]
    );
    res.json({ success: true, message: 'Message sent' });
  } catch (err) {
    fail(res, err);
  }
});

// NEWSLETTER SIGNUP
app.post('/api/newsletter', formLimiter, async (req, res) => {
  const email = str(req.body.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 255) return res.status(400).json({ error: 'Escribe un email válido.' });

  try {
    await pool.query(
      'INSERT INTO newsletter (email) VALUES ($1) ON CONFLICT DO NOTHING',
      [email]
    );
    res.json({ success: true, message: 'Subscribed' });
  } catch (err) {
    fail(res, err);
  }
});

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tres Horizontes API running' });
});

// ===== RUTAS DESCONOCIDAS Y ERRORES =====
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande.' });
  fail(res, err);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
  });
});
