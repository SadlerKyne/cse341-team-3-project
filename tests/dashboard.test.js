import { describe, expect, test } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';
import { Role } from '../src/models/schemas/roles.js';
import { User } from '../src/models/schemas/users.js';

const signIn = async (email, roleName) => {
  const role = await Role.findOne({ name: roleName });
  const username = email.split('@')[0];
  await User.create({
    name: 'Maya',
    username,
    email,
    passwordHash: await bcrypt.hash('password', 4),
    role: role._id
  });
  const agent = request.agent(app);
  const login = await agent.post('/login').type('form').send({ email, password: 'password' });
  return { agent, login };
};

describe('user dashboard and navigation', () => {
  test('signed-out users are sent to login and see Login/Register links', async () => {
    const dashboard = await request(app).get('/dashboard');
    const api = await request(app).get('/api/bookings/mine');
    const home = await request(app).get('/');

    expect(dashboard.headers.location).toBe('/login');
    expect(api.status).toBe(401);
    expect(home.text).toContain('href="/login"');
    expect(home.text).not.toContain('Logout');
  });

  test('customers go to /dashboard, see their name and Logout, and cannot open /admin', async () => {
    const { agent, login } = await signIn('maya@example.com', 'customer');

    expect(login.headers.location).toBe('/dashboard');
    const dashboard = await agent.get('/dashboard');
    expect(dashboard.text).toContain('Welcome, Maya!');
    expect(dashboard.text).toContain('Logout');
    expect(dashboard.text).not.toContain('href="/login"');
    expect((await agent.get('/admin')).status).toBe(403);
  });

  test('admins go to /admin', async () => {
    const { agent, login } = await signIn('admin@example.com', 'admin');

    expect(login.headers.location).toBe('/admin');
    const dashboard = await agent.get('/admin');
    expect(dashboard.status).toBe(200);
    expect(dashboard.text).toContain('Welcome to the Admin Dashboard');
  });

  test('GET /api/bookings/mine returns only bookings with the user as a passenger', async () => {
    await getDb().collection('bookings').insertMany([
      { id: 'JRMINE', passengers: [{ email: 'maya@example.com' }] },
      { id: 'JROTHER', passengers: [{ email: 'ken@example.com' }] }
    ]);
    const { agent } = await signIn('maya@example.com', 'customer');

    const response = await agent.get('/api/bookings/mine');

    expect(response.status).toBe(200);
    expect(response.body.map((booking) => booking.id)).toEqual(['JRMINE']);
  });
});
