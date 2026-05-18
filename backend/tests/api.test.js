const request = require('supertest');
const app = require('../server');

describe('HabitHub API', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/quote returns a quote', async () => {
    const res = await request(app).get('/api/quote');
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.quote).toBe('string');
    expect(res.body.quote.length).toBeGreaterThan(5);
  });

  it('GET /api/habits returns array', async () => {
    const res = await request(app).get('/api/habits');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/habits creates a habit', async () => {
    const res = await request(app)
      .post('/api/habits')
      .send({ name: 'Test Habit', description: 'Test', color: '#22c55e', icon: '⚡' });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Test Habit');
    expect(res.body.id).toBeDefined();
  });

  it('POST /api/habits returns 400 without name', async () => {
    const res = await request(app).post('/api/habits').send({ description: 'No name' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/stats returns stats object', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('totalHabits');
    expect(res.body).toHaveProperty('totalXP');
  });

  it('GET /api/analytics returns timeline and perHabit', async () => {
    const res = await request(app).get('/api/analytics');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('timeline');
    expect(res.body).toHaveProperty('perHabit');
  });
});
