const express = require('express');
const request = require('supertest');
const { DatabaseError } = require('sequelize');
const i18n = require('../config/i18n');
const { errorHandler, resolveError } = require('../middlewares/errorHandler');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

// arma un error como el que manda sequelize cuando postgres rechaza la consulta
// el codigo de postgres queda en err.parent.code y err.original.code
function pgError(code, message = 'error de postgres') {
  const pg = Object.assign(new Error(message), { code });
  return new DatabaseError(pg);
}

// app chiquita: la ruta solo manda al errorHandler el error que le pasemos
function buildApp(err) {
  const app = express();
  app.use(i18n.init);
  app.get('/api/users/:id', (req, res, next) => next(err));
  app.use(errorHandler);
  return app;
}

describe('errorHandler: errores de Postgres por datos mal escritos', () => {
  test('el código llega en parent y original del DatabaseError', () => {
    const err = pgError('22P02');
    expect(err.parent.code).toBe('22P02');
    expect(err.original.code).toBe('22P02');
    expect(err.code).toBeUndefined();
  });

  test.each([
    ['22P02', 'invalid input syntax for type integer: "id-invalido"'],
    ['22003', 'value "99999999999" is out of range for type integer']
  ])('%s se convierte en 400 common.invalidId', (code, message) => {
    expect(resolveError(pgError(code, message))).toEqual({ status: 400, key: 'common.invalidId' });
  });

  test('también funciona si solo viene original (sin parent)', () => {
    const err = pgError('22003');
    delete err.parent;
    expect(resolveError(err)).toEqual({ status: 400, key: 'common.invalidId' });
  });

  test('otro error de Postgres sigue siendo 500', () => {
    // 42P01: la tabla no existe, es un error interno y no del cliente
    expect(resolveError(pgError('42P01'))).toEqual({ status: 500, key: 'common.internal' });
  });

  test('un error cualquiera con code 22P02 pero que no es de sequelize sigue siendo 500', () => {
    const err = Object.assign(new Error('x'), { parent: { code: '22P02' } });
    expect(resolveError(err)).toEqual({ status: 500, key: 'common.internal' });
  });

  test.each([
    ['22P02', 'en', en.common.invalidId],
    ['22P02', 'es', es.common.invalidId],
    ['22003', 'en', en.common.invalidId],
    ['22003', 'es', es.common.invalidId]
  ])('%s responde 400 en JSON traducido (%s) sin detalles de Postgres', async (code, lang, expected) => {
    const res = await request(buildApp(pgError(code, 'detalle interno de postgres'))).get(`/api/users/id-invalido?lang=${lang}`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: expected });
  });
});
