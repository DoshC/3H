require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
};

// ===== ROUTES =====

// REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );
    
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: result.rows[0], token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid password' });
    
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone }, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET TOURS
app.get('/api/tours', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tours ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET TOUR BY ID
app.get('/api/tours/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tours WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE BOOKING (protected)
app.post('/api/bookings', verifyToken, async (req, res) => {
  try {
    const { tour_id, travel_date, guests, notes } = req.body;
    const n = Number(guests);
    if (!tour_id || !travel_date) return res.status(400).json({ error: 'tour_id and travel_date are required' });
    if (!Number.isInteger(n) || n < 1 || n > 20) return res.status(400).json({ error: 'guests must be between 1 and 20' });
    if (new Date(travel_date) < new Date(new Date().toDateString())) return res.status(400).json({ error: 'travel_date is in the past' });

    const result = await pool.query(
      'INSERT INTO bookings (user_id, tour_id, travel_date, guests, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, tour_id, travel_date, n, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// CANCEL BOOKING (protected, solo reservas propias y pendientes/confirmadas)
app.patch('/api/bookings/:id/cancel', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled'
        WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'confirmed')
        RETURNING *`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found or not cancellable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE PROFILE (protected)
app.put('/api/users/me', verifyToken, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (phone.length > 20) return res.status(400).json({ error: 'Phone too long' });

    const result = await pool.query(
      'UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING id, email, name, phone',
      [name, phone || null, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CONTACT FORM
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    await pool.query(
      'INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)',
      [name, email, message]
    );
    
    res.json({ success: true, message: 'Message sent' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// NEWSLETTER SIGNUP
app.post('/api/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    
    await pool.query(
      'INSERT INTO newsletter (email) VALUES ($1) ON CONFLICT DO NOTHING',
      [email]
    );
    
    res.json({ success: true, message: 'Subscribed' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tres Horizontes API running' });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
  });
});
