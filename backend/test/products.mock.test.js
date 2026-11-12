const express = require('express');
const request = require('supertest');

// Simulamos el modelo Product para no usar PostgreSQL
jest.mock('../models/sql', () => ({
    Product: {
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn()
    }
}));

// Simulamos la autenticación
jest.mock('../middlewares/authenticate', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, role_id: 3 };
        next();
    }
}));

// Simulamos la autorización
jest.mock('../middlewares/authorize', () => ({
    authorize: () => (req, res, next) => next()
}));

const { Product } = require('../models/sql');
const productsRouter = require('../routes/products');

// Aplicación Express exclusiva para estas pruebas
const app = express();

app.use(express.json());
app.use('/api/products', productsRouter);

// Manejador de errores
app.use((err, req, res, next) => {
    res.status(500).json({
        message: err.message
    });
});

describe('Products API con mocks', () => {

    beforeEach(() => {
        jest.resetAllMocks();
    });

    // TEST 1
    test('GET /api/products responde 200 con productos', async () => {

        Product.findAll.mockResolvedValue([
            { id: 1, name: 'Tenis Nike', price: 1500 },
            { id: 2, name: 'Tenis Adidas', price: 1200 }
        ]);

        const res = await request(app)
            .get('/api/products');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data).toHaveLength(2);
        expect(Product.findAll).toHaveBeenCalled();
    });

    // TEST 2
    test('GET /api/products/:id responde 200 si existe', async () => {

        Product.findByPk.mockResolvedValue({
            id: 1,
            name: 'Tenis Nike',
            price: 1500
        });

        const res = await request(app)
            .get('/api/products/1');

        expect(res.statusCode).toBe(200);
        expect(res.body.data.id).toBe(1);
        expect(Product.findByPk).toHaveBeenCalledWith('1');
    });

    // TEST 3
    test('GET /api/products/:id responde 404 si no existe', async () => {

        Product.findByPk.mockResolvedValue(null);

        const res = await request(app)
            .get('/api/products/999');

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Product not found');
    });

    // TEST 4
    test('POST /api/products crea un producto', async () => {

        const datos = {
            name: 'Tenis Puma',
            price: 1800,
            brand: 'Puma'
        };

        Product.create.mockResolvedValue({
            id: 3,
            ...datos
        });

        const res = await request(app)
            .post('/api/products')
            .send(datos);

        expect(res.statusCode).toBe(201);
        expect(res.body.data.name).toBe('Tenis Puma');

        expect(Product.create).toHaveBeenCalledWith(
            expect.objectContaining(datos)
        );
    });

    // TEST 5
    test('POST /api/products sin nombre responde 400', async () => {

        const res = await request(app)
            .post('/api/products')
            .send({
                price: 1500
            });

        expect(res.statusCode).toBe(400);
        expect(Product.create).not.toHaveBeenCalled();
    });

    // TEST 6
    test('POST /api/products sin precio responde 400', async () => {

        const res = await request(app)
            .post('/api/products')
            .send({
                name: 'Tenis Nike'
            });

        expect(res.statusCode).toBe(400);
        expect(Product.create).not.toHaveBeenCalled();
    });

    // TEST 7
    test('PUT /api/products/:id actualiza un producto', async () => {

        const producto = {
            id: 1,
            name: 'Tenis Nike',
            price: 1500,

            update: jest.fn(async function (datos) {
                Object.assign(this, datos);
            })
        };

        Product.findByPk.mockResolvedValue(producto);

        const res = await request(app)
            .put('/api/products/1')
            .send({
                price: 1700
            });

        expect(res.statusCode).toBe(200);
        expect(producto.update).toHaveBeenCalledWith({
            price: 1700
        });

        expect(res.body.data.price).toBe(1700);
    });

    // TEST 8
    test('PUT /api/products/:id responde 404 si no existe', async () => {

        Product.findByPk.mockResolvedValue(null);

        const res = await request(app)
            .put('/api/products/999')
            .send({
                price: 1700
            });

        expect(res.statusCode).toBe(404);
    });

    // TEST 9
    test('DELETE /api/products/:id elimina un producto', async () => {

        const producto = {
            id: 1,
            name: 'Tenis Nike',

            destroy: jest.fn().mockResolvedValue(undefined)
        };

        Product.findByPk.mockResolvedValue(producto);

        const res = await request(app)
            .delete('/api/products/1');

        expect(res.statusCode).toBe(200);
        expect(producto.destroy).toHaveBeenCalled();
        expect(res.body.data.id).toBe(1);
    });

    // TEST 10
    test('DELETE /api/products/:id responde 404 si no existe', async () => {

        Product.findByPk.mockResolvedValue(null);

        const res = await request(app)
            .delete('/api/products/999');

        expect(res.statusCode).toBe(404);
    });

});