const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './habits.db',     
  logging: false
});

sequelize.authenticate()
  .then(() => console.log(' SQLite Database connected successfully'))
  .catch(err => console.error(' Unable to connect to SQLite:', err));

const Habit = sequelize.define('Habit', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING }
}, { timestamps: true });

const Log = sequelize.define('Log', {
  habitId: { 
    type: DataTypes.INTEGER, 
    references: { model: 'Habits', key: 'id' } 
  },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  completed: { type: DataTypes.BOOLEAN, defaultValue: true },
  notes: { type: DataTypes.STRING }
}, { timestamps: true });

sequelize.sync({ alter: true })
  .then(() => console.log(' Database tables synced'));

const quotes = [
  "Small steps every day lead to massive results!",
  "You are one habit away from a completely different life.",
  "Consistency beats intensity.",
  "The best time to start was yesterday. The next best time is now."
];

app.get('/api/habits', async (req, res) => {
  const habits = await Habit.findAll({ order: [['createdAt', 'DESC']] });
  res.json(habits);
});

app.post('/api/habits', async (req, res) => {
  const habit = await Habit.create(req.body);
  res.json(habit);
});

app.delete('/api/habits/:id', async (req, res) => {
  await Habit.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Habit deleted' });
});

app.get('/api/logs/:habitId', async (req, res) => {
  const logs = await Log.findAll({ 
    where: { habitId: req.params.habitId },
    order: [['date', 'DESC']]
  });
  res.json(logs);
});

app.post('/api/logs', async (req, res) => {
  const log = await Log.create(req.body);
  res.json(log);
});

app.get('/api/quote', (req, res) => {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  res.json({ quote });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` HabitHub running on http://localhost:${PORT}`);
});