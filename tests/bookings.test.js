import { describe, expect, test } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';
import { Role } from '../src/models/schemas/roles.js';
import { User } from '../src/models/schemas/users.js';

const createAdminAgent = async () => {
  const adminRole = await Role.findOne({ name: 'admin' });
  await User.create({
    name: 'Admin User',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('admin-password', 12),
    role: adminRole._id
  });

  const agent = request.agent(app);
  await agent.post('/login').type('form').send({
    email: 'admin@example.com',
    password: 'admin-password'
  });
  return agent;
};

const validBooking = {
  scheduleId: '1',
  tripId: 'alpine-panorama',
  ticketClass: 'premium',
  selectedDay: 'monday',
  'passengers[0][firstName]': 'Maya',
  'passengers[0][lastName]': 'Rivera',
  'passengers[0][email]': 'maya@example.com',
  'passengers[0][phone]': '555-0100'
};

describe('GET /api/bookings', () => {
  test('returns 401 for unauthenticated requests', async () => {
    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Authentication required' });
  });

  test('returns an empty array to an admin when there are no bookings', async () => {
    const response = await (await createAdminAgent()).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({
      data: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      filters: { ticketClass: null, from: null, to: null }
    });
  });

  test('returns bookings newest first', async () => {
    await getDb().collection('bookings').insertMany([
      { id: 'JROLD', tripId: 'alpine-panorama', createdAt: new Date('2026-01-01') },
      { id: 'JRNEW', tripId: 'coastal-breeze', createdAt: new Date('2026-02-01') }
    ]);

    const response = await (await createAdminAgent()).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.data.map((booking) => booking.id)).toEqual(['JRNEW', 'JROLD']);
  });

  test('returns 10 bookings per page with metadata', async () => {
    await getDb().collection('bookings').insertMany(
      Array.from({ length: 12 }, (_, i) => ({
        id: `JR${String(i + 1).padStart(2, '0')}`,
        tripId: 'alpine-panorama',
        createdAt: new Date(2026, 0, i + 1)
      }))
    );
    const agent = await createAdminAgent();

    const first = await agent.get('/api/bookings');
    expect(first.body).toMatchObject({ page: 1, limit: 10, total: 12, totalPages: 2 });
    expect(first.body.data).toHaveLength(10);
    expect(first.body.data[0].id).toBe('JR12');

    const second = await agent.get('/api/bookings?page=2');
    expect(second.body.data.map((booking) => booking.id)).toEqual(['JR02', 'JR01']);
  });

  test('returns 400 for an invalid page or limit', async () => {
    const agent = await createAdminAgent();

    for (const query of ['page=0', 'page=abc', 'limit=0', 'limit=51']) {
      expect((await agent.get(`/api/bookings?${query}`)).status).toBe(400);
    }
  });
});

describe('GET /api/bookings filters', () => {
  const insertBookings = () => getDb().collection('bookings').insertMany([
    { id: 'JRA', ticketClass: 'first', createdAt: new Date('2026-11-01T10:00:00Z') },
    { id: 'JRB', ticketClass: 'standard', createdAt: new Date('2026-11-15T23:30:00Z') },
    { id: 'JRC', ticketClass: 'first', createdAt: new Date('2026-11-20T08:00:00Z') }
  ]);

  test('filters by ticket class', async () => {
    await insertBookings();
    const response = await (await createAdminAgent()).get('/api/bookings?ticketClass=first');

    expect(response.body.data.map((booking) => booking.id)).toEqual(['JRC', 'JRA']);
    expect(response.body.total).toBe(2);
    expect(response.body.filters).toEqual({ ticketClass: 'first', from: null, to: null });
  });

  test('filters by date range and includes the whole "to" day', async () => {
    await insertBookings();
    const agent = await createAdminAgent();

    const range = await agent.get('/api/bookings?from=2026-11-02&to=2026-11-15');
    expect(range.body.data.map((booking) => booking.id)).toEqual(['JRB']);

    const combined = await agent.get('/api/bookings?ticketClass=first&from=2026-11-10');
    expect(combined.body.data.map((booking) => booking.id)).toEqual(['JRC']);
  });

  test('returns 400 for an unknown ticket class, a bad date, or from after to', async () => {
    const agent = await createAdminAgent();

    for (const query of ['ticketClass=economy', 'from=11/01/2026', 'to=2026-02-30', 'from=2026-11-20&to=2026-11-01']) {
      expect((await agent.get(`/api/bookings?${query}`)).status).toBe(400);
    }
  });
});

describe('POST /trips/book', () => {
  test('saves the booking to the bookings collection and redirects to its confirmation', async () => {
    const response = await request(app).post('/trips/book').type('form').send(validBooking);

    expect(response.status).toBe(302);
    const bookingId = response.headers.location.split('/').pop();
    expect(response.headers.location).toBe(`/trips/confirmation/${bookingId}`);

    const saved = await getDb().collection('bookings').findOne({ id: bookingId });
    expect(saved).toMatchObject({
      scheduleId: 1,
      tripId: 'alpine-panorama',
      ticketClass: 'premium',
      selectedDay: 'monday',
      passengers: [{ firstName: 'Maya', lastName: 'Rivera', email: 'maya@example.com', phone: '555-0100' }]
    });
    expect(await getDb().collection('confirmations').countDocuments()).toBe(0);

    const confirmation = await request(app).get(response.headers.location);
    expect(confirmation.status).toBe(200);
    expect(confirmation.text).toContain(bookingId);
  });

  test('ignores fields that are not part of a booking', async () => {
    const response = await request(app)
      .post('/trips/book')
      .type('form')
      .send({ ...validBooking, isAdmin: 'true' });

    const bookingId = response.headers.location.split('/').pop();
    const saved = await getDb().collection('bookings').findOne({ id: bookingId });
    expect(saved).not.toHaveProperty('isAdmin');
  });

  test('returns 400 when there are no passengers', async () => {
    const response = await request(app)
      .post('/trips/book')
      .type('form')
      .send({ scheduleId: '1', tripId: 'alpine-panorama', ticketClass: 'premium', selectedDay: 'monday' });

    expect(response.status).toBe(400);
    expect(await getDb().collection('bookings').countDocuments()).toBe(0);
  });
});

describe('booking pages', () => {
  test('GET /trips/booking/:scheduleId returns 404 for a schedule that does not exist', async () => {
    const response = await request(app).get('/trips/booking/9999');

    expect(response.status).toBe(404);
  });

  test('GET /trips/confirmation/:bookingId returns 404 for a booking that does not exist', async () => {
    const response = await request(app).get('/trips/confirmation/JRNOTREAL');

    expect(response.status).toBe(404);
  });

  test('GET /bookings-admin renders the admin page', async () => {
    const response = await (await createAdminAgent()).get('/bookings-admin');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Bookings Admin');
    expect(response.text).toContain('booking-row-template');
  });
});
