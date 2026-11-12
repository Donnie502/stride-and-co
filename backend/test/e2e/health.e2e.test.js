const { api } = require('./helpers');

describe('Health Check E2E', () => {
  test('GET /health responde 200 con {"status":"UP"}', async () => {
    const res = await api.get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'UP' });
  });
});
