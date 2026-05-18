CREATE TABLE IF NOT EXISTS habits (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  description TEXT DEFAULT '',
  color      TEXT DEFAULT '#22c55e',
  icon       TEXT DEFAULT '⚡',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id         SERIAL PRIMARY KEY,
  habit_id   INTEGER REFERENCES habits(id) ON DELETE CASCADE,
  log_date   DATE DEFAULT CURRENT_DATE,
  completed  BOOLEAN DEFAULT TRUE,
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_habit_id ON logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(log_date);

INSERT INTO habits (name, description, color, icon) VALUES
  ('Morning Run', 'Run 5km every morning', '#f59e0b', '🏃'),
  ('Read Books', 'Read at least 20 pages daily', '#8b5cf6', '📚'),
  ('Drink Water', 'Drink 3 litres of water', '#06b6d4', '💧')
ON CONFLICT DO NOTHING;
