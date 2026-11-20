import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { User } from '../src/models/schemas/users.js';
import { verifyPassword } from '../src/models/auth.js';

const credentials = {
  name: 'Test User',
  username: 'testuser',
  email: 'test.user@example.com',
  password: 'secure-test-password'
};

describe('POST /register', () => {
  test('creates a customer with a hashed password', async () => {
    const response = await request(app).post('/register').type('form').send(credentials);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');

    const user = await User.findOne({ email: credentials.email }).populate('role');
    expect(user.name).toBe(credentials.name);
    expect(user.username).toBe(credentials.username);
    expect(user.role.name).toBe('customer');
    expect(user.passwordHash).not.toBe(credentials.password);
    expect(await verifyPassword(credentials.password, user.passwordHash)).toBe(true);
  });

  test('rejects duplicate email addresses', async () => {
    await request(app).post('/register').type('form').send(credentials);
    const response = await request(app)
      .post('/register')
      .type('form')
      .send({ ...credentials, email: credentials.email.toUpperCase() });

    expect(response.status).toBe(409);
    expect(response.text).toContain('An account with that email already exists.');
  });

  test('rejects duplicate usernames regardless of case', async () => {
    await request(app).post('/register').type('form').send(credentials);
    const response = await request(app)
      .post('/register')
      .type('form')
      .send({ ...credentials, email: 'another@example.com', username: credentials.username.toUpperCase() });

    expect(response.status).toBe(409);
    expect(response.text).toContain('An account with that username already exists.');
  });
});

describe('POST /login and /logout', () => {
  test('rejects an incorrect password', async () => {
    await request(app).post('/register').type('form').send(credentials);

    const response = await request(app)
      .post('/login')
      .type('form')
      .send({ email: credentials.email, password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.text).toContain('Invalid email or password.');
  });

  test('logs in and destroys the session on logout', async () => {
    await request(app).post('/register').type('form').send(credentials);
    const agent = request.agent(app);

    const login = await agent
      .post('/login')
      .type('form')
      .send({ email: credentials.email, password: credentials.password });

    expect(login.status).toBe(302);
    expect(login.headers.location).toBe('/dashboard');

    const logout = await agent.post('/logout');
    expect(logout.status).toBe(302);
    expect(logout.headers.location).toBe('/');
    expect(logout.headers['set-cookie'].join(';')).toContain('connect.sid=;');
  });
});

describe('admin route authorization', () => {
  test('redirects anonymous page requests to login and returns JSON for API requests', async () => {
    const pageResponse = await request(app).get('/bookings-admin');
    const apiResponse = await request(app).get('/api/bookings');

    expect(pageResponse.status).toBe(302);
    expect(pageResponse.headers.location).toBe('/login');
    expect(apiResponse.status).toBe(401);
    expect(apiResponse.body).toEqual({ message: 'Authentication required' });
  });

  test('forbids customers from accessing admin pages and APIs', async () => {
    await request(app).post('/register').type('form').send(credentials);
    const agent = request.agent(app);
    await agent.post('/login').type('form').send({
      email: credentials.email,
      password: credentials.password
    });

    const pageResponse = await agent.get('/bookings-admin');
    const apiResponse = await agent.get('/api/bookings');

    expect(pageResponse.status).toBe(403);
    expect(pageResponse.text).toContain('You do not have permission to access this page.');
    expect(apiResponse.status).toBe(403);
    expect(apiResponse.body).toEqual({ message: 'Forbidden' });
  });
});
