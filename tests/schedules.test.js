import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/trips/:id/schedules', () => {
  test('returns all schedules for a trip', async () => {
    const response = await request(app).get('/api/trips/alpine-panorama/schedules');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toHaveLength(2);
    response.body.forEach((schedule) => {
      expect(schedule.tripId).toBe('alpine-panorama');
    });
  });

  test('returns 404 for a trip that does not exist', async () => {
    const response = await request(app).get('/api/trips/not-a-trip/schedules');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Trip not found' });
  });
});

describe('GET /api/trips/:id/schedules?month=', () => {
  test('returns schedules for a month the trip runs in', async () => {
    // alpine-panorama runs April through November.
    const response = await request(app).get('/api/trips/alpine-panorama/schedules?month=6');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test('returns an empty array for a month the trip does not run in', async () => {
    const response = await request(app).get('/api/trips/alpine-panorama/schedules?month=1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test.each(['0', '13', 'june', '2.5', ''])('returns 400 for month=%s', async (month) => {
    const response = await request(app).get(`/api/trips/alpine-panorama/schedules?month=${month}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'month must be a whole number from 1 to 12' });
  });

  test('returns 404 for a trip that does not exist', async () => {
    const response = await request(app).get('/api/trips/not-a-trip/schedules?month=6');

    expect(response.status).toBe(404);
  });
});
