
const express = require('express');
const request = require('supertest');

// Simular el modelo Customer
jest.mock('../models/mongo', () => ({
    Customer: {
        find: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn()
    }
}));

// Simular autenticación
jest.mock('../middlewares/authenticate', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, role_id: 3 };
        next();
    }
}));

// RBAC se comprueba en sus propias pruebas
jest.mock('../middlewares/authorize', () => ({
    authorize: () => (req, res, next) => next()
}));

jest.mock('../middlewares/ownerResolvers', () => ({
    customerOwner: jest.fn()
}));

const { Customer } = require('../models/mongo');
const customersRouter = require('../routes/customers');

const app = express();
app.use(express.json());
app.use('/api/customers', customersRouter);

app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message });
});

beforeEach(() => {
    jest.resetAllMocks();
});

describe('Customers API con mocks', () => {

    test('GET /api/customers responde 200', async () => {
        Customer.find.mockResolvedValue([
            { _id: 'cliente1', email: 'cliente@prueba.com' }
        ]);

        const res = await request(app).get('/api/customers');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(Customer.find).toHaveBeenCalled();
    });

    test('GET /api/customers/:id responde 200', async () => {
        Customer.findById.mockResolvedValue({
            _id: 'cliente1',
            email: 'cliente@prueba.com'
        });

        const res = await request(app)
            .get('/api/customers/cliente1');

        expect(res.statusCode).toBe(200);
        expect(res.body.data._id).toBe('cliente1');
    });

    test('GET /api/customers/:id responde 404', async () => {
        Customer.findById.mockResolvedValue(null);

        const res = await request(app)
            .get('/api/customers/inexistente');

        expect(res.statusCode).toBe(404);
    });

    test('POST /api/customers responde 201', async () => {
        const datos = {
            userId: 1,
            email: 'nuevo@prueba.com'
        };

        Customer.create.mockResolvedValue({
            _id: 'cliente2',
            ...datos
        });

        const res = await request(app)
            .post('/api/customers')
            .send(datos);

        expect(res.statusCode).toBe(201);
        expect(Customer.create).toHaveBeenCalledWith(datos);
        expect(res.body.data.email).toBe(datos.email);
    });

    test('PUT /api/customers/:id responde 200', async () => {
        const actualizado = {
            _id: 'cliente1',
            email: 'actualizado@prueba.com'
        };

        Customer.findById.mockResolvedValue({
            _id: 'cliente1'
        });

        Customer.findByIdAndUpdate.mockResolvedValue(
            actualizado
        );

        const res = await request(app)
            .put('/api/customers/cliente1')
            .send({
                email: 'actualizado@prueba.com'
            });

        expect(res.statusCode).toBe(200);

        expect(Customer.findByIdAndUpdate)
            .toHaveBeenCalledWith(
                'cliente1',
                { email: 'actualizado@prueba.com' },
                { new: true, runValidators: true }
            );

        expect(res.body.data.email)
            .toBe('actualizado@prueba.com');
    });

    test('PUT /api/customers/:id responde 404', async () => {
        Customer.findById.mockResolvedValue(null);

        const res = await request(app)
            .put('/api/customers/inexistente')
            .send({ email: 'nuevo@prueba.com' });

        expect(res.statusCode).toBe(404);
        expect(Customer.findByIdAndUpdate)
            .not.toHaveBeenCalled();
    });

    test('DELETE /api/customers/:id responde 200', async () => {
        Customer.findById.mockResolvedValue({
            _id: 'cliente1'
        });

        Customer.findByIdAndDelete.mockResolvedValue({
            _id: 'cliente1'
        });

        const res = await request(app)
            .delete('/api/customers/cliente1');

        expect(res.statusCode).toBe(200);
        expect(res.body.data.id).toBe('cliente1');

        expect(Customer.findByIdAndDelete)
            .toHaveBeenCalledWith('cliente1');
    });

    test('DELETE /api/customers/:id responde 404', async () => {
        Customer.findById.mockResolvedValue(null);

        const res = await request(app)
            .delete('/api/customers/inexistente');

        expect(res.statusCode).toBe(404);

        expect(Customer.findByIdAndDelete)
            .not.toHaveBeenCalled();
    });
});
