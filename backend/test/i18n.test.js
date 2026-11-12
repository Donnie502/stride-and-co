const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../app');
const es = require('../locales/es.json');
const en = require('../locales/en.json');
const { USERS, loadPermissions, mockUsers, bearer } = require('./helpers/apiMocks');

// convierte { a: { b: 'x' } } en ['a.b'] para comparar las claves
function flatKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? flatKeys(value, full) : [full];
  });
}

// ruta protegida sin token: responde 401 con el mensaje traducido, no necesita BD
const UNAUTHORIZED = { en: en.auth.unauthorized, es: es.auth.unauthorized };

describe('archivos de idiomas', () => {
  test('es.json y en.json tienen exactamente las mismas claves', () => {
    expect(flatKeys(es).sort()).toEqual(flatKeys(en).sort());
  });

  test('ninguna traducción está vacía', () => {
    for (const file of [es, en]) {
      for (const key of flatKeys(file)) {
        const value = key.split('.').reduce((obj, part) => obj[part], file);
        expect(typeof value).toBe('string');
        expect(value.trim()).not.toBe('');
      }
    }
  });
});

describe('controllers', () => {
  const dir = path.join(__dirname, '..', 'controllers');

  // quita comentarios para no contar codigo comentado
  const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

  const sources = fs.readdirSync(dir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => ({ file, code: stripComments(fs.readFileSync(path.join(dir, file), 'utf8')) }));

  test('no quedan message: con texto literal', () => {
    const literal = /message\s*:\s*['"`]/;
    const withLiteral = sources.filter(({ code }) => literal.test(code)).map(({ file }) => file);
    expect(withLiteral).toEqual([]);
  });

  test('req.__ siempre recibe la clave como texto fijo', () => {
    // si la clave fuera una variable esta prueba no podria revisar que exista
    for (const { file, code } of sources) {
      const calls = code.match(/req\.__\(\s*[^)\s]/g) || [];
      for (const call of calls) expect(`${file}: ${call}`).toMatch(/\(\s*'$/);
    }
  });

  test('todas las claves usadas con req.__ y messageKey existen en ambos idiomas', () => {
    const used = new Set();
    for (const { code } of sources) {
      for (const match of code.matchAll(/(?:req\.__\(|messageKey:)\s*'([^']+)'/g)) used.add(match[1]);
    }
    expect(used.size).toBeGreaterThan(0);

    const esKeys = new Set(flatKeys(es));
    const enKeys = new Set(flatKeys(en));
    const missing = [...used].filter((key) => !esKeys.has(key) || !enKeys.has(key));
    expect(missing).toEqual([]);
  });
});

describe('detección del idioma', () => {
  test('?lang=en responde en inglés', async () => {
    const res = await request(app).get('/api/customers?lang=en');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe(UNAUTHORIZED.en);
  });

  test('?lang=es responde en español', async () => {
    const res = await request(app).get('/api/customers?lang=es');
    expect(res.body.message).toBe(UNAUTHORIZED.es);
  });

  test('Accept-Language: es responde en español', async () => {
    const res = await request(app).get('/api/customers').set('Accept-Language', 'es');
    expect(res.body.message).toBe(UNAUTHORIZED.es);
  });

  test('Accept-Language: en responde en inglés', async () => {
    const res = await request(app).get('/api/customers').set('Accept-Language', 'en-US,en;q=0.9');
    expect(res.body.message).toBe(UNAUTHORIZED.en);
  });

  test('?lang tiene prioridad sobre Accept-Language', async () => {
    const res = await request(app).get('/api/customers?lang=en').set('Accept-Language', 'es');
    expect(res.body.message).toBe(UNAUTHORIZED.en);
  });

  test('sin ?lang ni Accept-Language usa el idioma por defecto (en)', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.body.message).toBe(UNAUTHORIZED.en);
  });

  test('una cookie lang ya no cambia el idioma', async () => {
    const res = await request(app).get('/api/customers').set('Cookie', 'lang=es');
    expect(res.body.message).toBe(UNAUTHORIZED.en);
  });

  test('Accept-Language: fr (no soportado) cae al idioma por defecto', async () => {
    const res = await request(app).get('/api/customers').set('Accept-Language', 'fr');
    expect(res.body.message).toBe(UNAUTHORIZED.en);
  });

  test('?lang=fr (no soportado) cae al idioma por defecto', async () => {
    const res = await request(app).get('/api/customers?lang=fr');
    expect(res.body.message).toBe(UNAUTHORIZED.en);
  });

  test('Accept-Language: es-MX se resuelve a es', async () => {
    const res = await request(app).get('/api/customers').set('Accept-Language', 'es-MX');
    expect(res.body.message).toBe(UNAUTHORIZED.es);
  });

  test('?lang=es-MX se resuelve a es', async () => {
    const res = await request(app).get('/api/customers?lang=es-MX');
    expect(res.body.message).toBe(UNAUTHORIZED.es);
  });

  test('pedir un idioma no soportado no crea archivos en locales/', async () => {
    await request(app).get('/api/customers?lang=fr').set('Accept-Language', 'fr');
    const files = fs.readdirSync(path.join(__dirname, '..', 'locales')).sort();
    expect(files).toEqual(['en.json', 'es.json']);
  });
});

describe('idioma en respuestas con usuario autenticado (mocks)', () => {
  beforeAll(loadPermissions);
  beforeEach(mockUsers);
  afterEach(() => jest.restoreAllMocks());

  test.each([
    ['en', en.auth.forbidden],
    ['es', es.auth.forbidden]
  ])('403 de authorize en %s', async (lang, expected) => {
    const res = await request(app).get('/api/customers').set('Accept-Language', lang).set('Authorization', bearer(USERS.guest));
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ message: expected });
  });
});

describe('vistas', () => {
  test('la página de error HTML se traduce y marca el idioma', async () => {
    const res = await request(app).get('/no-existe?lang=es');
    expect(res.statusCode).toBe(404);
    expect(res.text).toContain('<html lang="es">');
    expect(res.text).toContain(es.common.notFound);
  });

  test('la página de inicio se traduce', async () => {
    const res = await request(app).get('/').set('Accept-Language', 'es-MX');
    expect(res.text).toContain('Bienvenido a');
  });
});
