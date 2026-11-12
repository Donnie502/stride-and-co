const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');
const es = require('../../locales/es.json');

describe('Internacionalización (i18n) E2E', () => {
  let token;
  const invalidIdPath = '/api/customers/id-invalido';

  beforeAll(async () => {
    token = await login('admin');
  });

  test('?lang=es devuelve el mensaje en español', async () => {
    const res = await api
      .get(`${invalidIdPath}?lang=es`)
      .set(auth(token));

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: es.common.invalidId });
  });

  test('?lang=en devuelve el mensaje en inglés', async () => {
    const res = await api
      .get(`${invalidIdPath}?lang=en`)
      .set(auth(token));

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: en.common.invalidId });
  });

  test('Accept-Language: es devuelve el mensaje en español', async () => {
    const res = await api
      .get(invalidIdPath)
      .set(auth(token))
      .set('Accept-Language', 'es');

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: es.common.invalidId });
  });

  test('Accept-Language: en devuelve el mensaje en inglés', async () => {
    const res = await api
      .get(invalidIdPath)
      .set(auth(token))
      .set('Accept-Language', 'en');

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: en.common.invalidId });
  });

  test('?lang tiene prioridad sobre el header Accept-Language', async () => {
    const resEs = await api
      .get(`${invalidIdPath}?lang=es`)
      .set(auth(token))
      .set('Accept-Language', 'en');

    expect(resEs.statusCode).toBe(400);
    expect(resEs.body).toEqual({ message: es.common.invalidId });

    const resEn = await api
      .get(`${invalidIdPath}?lang=en`)
      .set(auth(token))
      .set('Accept-Language', 'es');

    expect(resEn.statusCode).toBe(400);
    expect(resEn.body).toEqual({ message: en.common.invalidId });
  });

  test('un idioma no soportado (fr) cae en el idioma por defecto (en)', async () => {
    const resQuery = await api
      .get(`${invalidIdPath}?lang=fr`)
      .set(auth(token));

    expect(resQuery.statusCode).toBe(400);
    expect(resQuery.body).toEqual({ message: en.common.invalidId });

    const resHeader = await api
      .get(invalidIdPath)
      .set(auth(token))
      .set('Accept-Language', 'fr');

    expect(resHeader.statusCode).toBe(400);
    expect(resHeader.body).toEqual({ message: en.common.invalidId });
  });

  test('la variante regional es-MX se resuelve a es', async () => {
    const resQuery = await api
      .get(`${invalidIdPath}?lang=es-MX`)
      .set(auth(token));

    expect(resQuery.statusCode).toBe(400);
    expect(resQuery.body).toEqual({ message: es.common.invalidId });

    const resHeader = await api
      .get(invalidIdPath)
      .set(auth(token))
      .set('Accept-Language', 'es-MX');

    expect(resHeader.statusCode).toBe(400);
    expect(resHeader.body).toEqual({ message: es.common.invalidId });
  });
});
