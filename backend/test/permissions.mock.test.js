const express = require('express');
const request = require('supertest');

// Mock del modelo Permission
// IMPORTANTE: el controlador importa este archivo directamente
jest.mock('../models/sql/Permission', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
}));

// Simulamos autenticación
jest.mock('../middlewares/authenticate', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            id: 1,
            role_id: 3
        };

        next();
    }
}));

// Simulamos autorización
jest.mock('../middlewares/authorize', () => ({
    authorize: () => (req, res, next) => next()
}));

const Permission = require('../models/sql/Permission');
const permissionsRouter = require('../routes/permissions');

// Aplicación Express para las pruebas
const app = express();

app.use(express.json());
app.use('/api/permissions', permissionsRouter);

// Manejador de errores
app.use((err, req, res, next) => {
    res.status(500).json({
        message: err.message
    });
});

describe('Permissions API con mocks', () => {

    beforeEach(() => {
        jest.resetAllMocks();
    });

    // TEST 1
    test('GET /api/permissions responde 200 con permisos', async () => {

        Permission.findAll.mockResolvedValue([
            {
                id: 1,
                key: 'products:read:any',
                description: 'View products'
            },
            {
                id: 2,
                key: 'products:create:any',
                description: 'Create products'
            }
        ]);

        const res = await request(app)
            .get('/api/permissions');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data).toHaveLength(2);
        expect(Permission.findAll).toHaveBeenCalled();
    });

    // TEST 2
    test('GET /api/permissions/:id responde 200 si existe', async () => {

        Permission.findByPk.mockResolvedValue({
            id: 1,
            key: 'products:read:any',
            description: 'View products'
        });

        const res = await request(app)
            .get('/api/permissions/1');

        expect(res.statusCode).toBe(200);
        expect(res.body.data.id).toBe(1);
        expect(Permission.findByPk).toHaveBeenCalledWith('1');
    });

    // TEST 3
    test('GET /api/permissions/:id responde 404 si no existe', async () => {

        Permission.findByPk.mockResolvedValue(null);

        const res = await request(app)
            .get('/api/permissions/999');

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Permission not found');
    });

    // TEST 4
    test('POST /api/permissions crea un permiso', async () => {

        const datos = {
            key: 'inventory:read:any',
            description: 'View inventory'
        };

        Permission.create.mockResolvedValue({
            id: 3,
            ...datos
        });

        const res = await request(app)
            .post('/api/permissions')
            .send(datos);

        expect(res.statusCode).toBe(201);
        expect(res.body.data.key).toBe('inventory:read:any');

        expect(Permission.create).toHaveBeenCalledWith(datos);
    });

    // TEST 5
    test('POST /api/permissions sin key responde 400', async () => {

        const res = await request(app)
            .post('/api/permissions')
            .send({
                description: 'Permiso sin key'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('key is required');
        expect(Permission.create).not.toHaveBeenCalled();
    });

    // TEST 6
    test('POST /api/permissions con key vacía responde 400', async () => {

        const res = await request(app)
            .post('/api/permissions')
            .send({
                key: '',
                description: 'Permiso inválido'
            });

        expect(res.statusCode).toBe(400);
        expect(Permission.create).not.toHaveBeenCalled();
    });

    // TEST 7
    test('PUT /api/permissions/:id actualiza un permiso', async () => {

        const permiso = {
            id: 1,
            key: 'products:read:any',
            description: 'View products',

            update: jest.fn(async function (changes) {
                Object.assign(this, changes);
                return this;
            })
        };

        Permission.findByPk.mockResolvedValue(permiso);

        const res = await request(app)
            .put('/api/permissions/1')
            .send({
                description: 'Read all products'
            });

        expect(res.statusCode).toBe(200);

        expect(permiso.update).toHaveBeenCalledWith({
            key: 'products:read:any',
            description: 'Read all products'
        });

        expect(res.body.data.description).toBe('Read all products');
        expect(res.body.data.key).toBe('products:read:any');
    });

    // TEST 8
    test('PUT /api/permissions/:id responde 404 si no existe', async () => {

        Permission.findByPk.mockResolvedValue(null);

        const res = await request(app)
            .put('/api/permissions/999')
            .send({
                description: 'Updated description'
            });

        expect(res.statusCode).toBe(404);
    });

    // TEST 9
    test('DELETE /api/permissions/:id elimina un permiso', async () => {

        const permiso = {
            id: 1,
            key: 'products:read:any',

            destroy: jest.fn().mockResolvedValue(undefined)
        };

        Permission.findByPk.mockResolvedValue(permiso);

        const res = await request(app)
            .delete('/api/permissions/1');

        expect(res.statusCode).toBe(200);
        expect(permiso.destroy).toHaveBeenCalled();
        expect(res.body.data.id).toBe(1);
    });

    // TEST 10
    test('DELETE /api/permissions/:id responde 404 si no existe', async () => {

        Permission.findByPk.mockResolvedValue(null);

        const res = await request(app)
            .delete('/api/permissions/999');

        expect(res.statusCode).toBe(404);
    });

});