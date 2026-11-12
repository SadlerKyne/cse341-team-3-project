import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';

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
  test('returns an empty array when there are no bookings', async () => {
    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual([]);
  });

  test('returns bookings newest first', async () => {
    await getDb().collection('bookings').insertMany([
      { id: 'JROLD', tripId: 'alpine-panorama', createdAt: new Date('2026-01-01') },
      { id: 'JRNEW', tripId: 'coastal-breeze', createdAt: new Date('2026-02-01') }
    ]);

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.map((booking) => booking.id)).toEqual(['JRNEW', 'JROLD']);
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
    const response = await request(app).get('/bookings-admin');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Bookings Admin');
    expect(response.text).toContain('booking-row-template');
  });
});
