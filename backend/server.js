const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(express.json());

async function waitForDB(pool, retries = 15, delay = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected successfully');
      return;
    } catch (e) {
      console.log(`DB not ready (attempt ${i}/${retries}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('Could not connect to database after retries. Exiting.');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'habithub',
  user: process.env.DB_USER || 'habithub',
  password: process.env.DB_PASSWORD || 'habithub123',
});

const quotes = [
  "Small steps every day lead to massive results.",
  "You are one habit away from a completely different life.",
  "Consistency beats intensity every single time.",
  "Excellence is not an act but a habit.",
  "We are what we repeatedly do.",
  "Your future self is watching. Make them proud.",
  "Motivation gets you started. Habit keeps you going.",
  "The best time to start was yesterday. The next best time is now.",
];

app.get('/api/health', async (req, res) => {
  let dbStatus = 'connected';
  try {
    await pool.query('SELECT 1');
  } catch (e) {
    dbStatus = 'disconnected';
  }
  res.json({ status: 'ok', db: dbStatus, timestamp: new Date().toISOString(), service: 'habithub-backend' });
});

app.get('/api/quote', (req, res) => {
  res.json({ quote: quotes[Math.floor(Math.random() * quotes.length)] });
});

app.get('/api/habits', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM habits ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/habits', async (req, res) => {
  const { name, description, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO habits (name, description, color, icon) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, description || '', color || '#22c55e', icon || '⚡']
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/habits/:id', async (req, res) => {
  const { name, description, color, icon } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE habits SET name=$1,description=$2,color=$3,icon=$4 WHERE id=$5 RETURNING *',
      [name, description || '', color || '#22c55e', icon || '⚡', req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/habits/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM logs WHERE habit_id=$1', [req.params.id]);
    await pool.query('DELETE FROM habits WHERE id=$1', [req.params.id]);
    res.json({ message: 'Habit deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/logs/:habitId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM logs WHERE habit_id=$1 ORDER BY log_date DESC',
      [req.params.habitId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logs', async (req, res) => {
  const { habitId, completed = true, notes } = req.body;
  const today = new Date().toISOString().split('T')[0];
  try {
    await pool.query(
      'INSERT INTO logs (habit_id, completed, log_date, notes) VALUES ($1,$2,$3,$4)',
      [habitId, completed, today, notes || '']
    );
    res.status(201).json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [habits, total, todayCount, weekly] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM habits'),
      pool.query('SELECT COUNT(*) FROM logs WHERE completed=true'),
      pool.query('SELECT COUNT(*) FROM logs WHERE log_date=$1 AND completed=true', [today]),
      pool.query("SELECT COUNT(*) FROM logs WHERE log_date >= NOW()-INTERVAL '7 days' AND completed=true"),
    ]);
    res.json({
      totalHabits: parseInt(habits.rows[0].count),
      totalCompletions: parseInt(total.rows[0].count),
      todayCompletions: parseInt(todayCount.rows[0].count),
      weeklyCompletions: parseInt(weekly.rows[0].count),
      totalXP: parseInt(total.rows[0].count) * 10,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const timeline = await pool.query(
      `SELECT log_date::text as date, COUNT(*) as count FROM logs
       WHERE completed=true AND log_date >= NOW()-INTERVAL '14 days'
       GROUP BY log_date ORDER BY log_date ASC`
    );
    const perHabit = await pool.query(
      `SELECT h.name, COUNT(l.id) as completions FROM habits h
       LEFT JOIN logs l ON l.habit_id=h.id AND l.completed=true
       GROUP BY h.id,h.name ORDER BY completions DESC`
    );
    res.json({ timeline: timeline.rows, perHabit: perHabit.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;

waitForDB(pool).then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`HabitHub API on port ${PORT}`));
});

module.exports = app;
