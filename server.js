const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

async function initDB() {
  const dbPath = process.env.DB_PATH || './habits.db';
  db = await open({ filename: dbPath, driver: sqlite3.Database });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#22c55e',
      icon TEXT DEFAULT '⚡',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habitId INTEGER,
      date TEXT DEFAULT (DATE('now')),
      completed INTEGER DEFAULT 1,
      notes TEXT,
      FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
    );
  `);

  try {
    await db.exec(`ALTER TABLE habits ADD COLUMN color TEXT DEFAULT '#22c55e'`);
  } catch (_) {}
  try {
    await db.exec(`ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT '⚡'`);
  } catch (_) {}

  console.log('SQLite database ready at', dbPath);
}

initDB().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

const quotes = [
  "Small steps every day lead to massive results.",
  "You are one habit away from a completely different life.",
  "Consistency beats intensity every single time.",
  "The best time to start was yesterday. The next best time is now.",
  "Excellence is not an act but a habit.",
  "We are what we repeatedly do.",
  "Your future self is watching. Make them proud.",
  "Motivation gets you started. Habit keeps you going.",
];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'habithub-backend' });
});

app.get('/api/quote', (req, res) => {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  res.json({ quote });
});

app.get('/api/habits', async (req, res) => {
  try {
    const habits = await db.all('SELECT * FROM habits ORDER BY createdAt DESC');
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/habits', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await db.run(
      'INSERT INTO habits (name, description, color, icon) VALUES (?, ?, ?, ?)',
      [name, description || null, color || '#22c55e', icon || '⚡']
    );
    res.status(201).json({ id: result.lastID, name, description, color, icon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/habits/:id', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    await db.run(
      'UPDATE habits SET name = ?, description = ?, color = ?, icon = ? WHERE id = ?',
      [name, description || null, color || '#22c55e', icon || '⚡', req.params.id]
    );
    res.json({ id: req.params.id, name, description, color, icon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/habits/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM logs WHERE habitId = ?', req.params.id);
    await db.run('DELETE FROM habits WHERE id = ?', req.params.id);
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs/:habitId', async (req, res) => {
  try {
    const logs = await db.all(
      'SELECT * FROM logs WHERE habitId = ? ORDER BY date DESC',
      req.params.habitId
    );
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await db.all('SELECT * FROM logs ORDER BY date DESC LIMIT 200');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { habitId, completed = true, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];
    await db.run(
      'INSERT INTO logs (habitId, completed, date, notes) VALUES (?, ?, ?, ?)',
      [habitId, completed ? 1 : 0, today, notes || null]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const totalHabits = await db.get('SELECT COUNT(*) as count FROM habits');
    const totalLogs = await db.get('SELECT COUNT(*) as count FROM logs WHERE completed = 1');
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = await db.get(
      "SELECT COUNT(*) as count FROM logs WHERE date = ? AND completed = 1", today
    );
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const weeklyLogs = await db.get(
      "SELECT COUNT(*) as count FROM logs WHERE date >= ? AND completed = 1", weekAgo
    );
    const recentDates = await db.all(
      "SELECT DISTINCT date FROM logs WHERE completed = 1 ORDER BY date DESC LIMIT 30"
    );
    let streak = 0;
    const dateSet = new Set(recentDates.map(r => r.date));
    let cursor = new Date();
    while (true) {
      const d = cursor.toISOString().split('T')[0];
      if (dateSet.has(d)) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }
    res.json({
      totalHabits: totalHabits.count,
      totalCompletions: totalLogs.count,
      todayCompletions: todayLogs.count,
      weeklyCompletions: weeklyLogs.count,
      currentStreak: streak,
      totalXP: totalLogs.count * 10
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      last14.push(d);
    }
    const rows = await db.all(
      `SELECT date, COUNT(*) as count FROM logs WHERE completed = 1 AND date >= ? GROUP BY date`,
      last14[0]
    );
    const byDate = {};
    rows.forEach(r => { byDate[r.date] = r.count; });
    const timeline = last14.map(d => ({ date: d, count: byDate[d] || 0 }));

    const perHabit = await db.all(
      `SELECT h.name, COUNT(l.id) as completions FROM habits h
       LEFT JOIN logs l ON l.habitId = h.id AND l.completed = 1
       GROUP BY h.id ORDER BY completions DESC`
    );

    res.json({ timeline, perHabit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`HabitHub API running on port ${PORT}`);
});

module.exports = app;