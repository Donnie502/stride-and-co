const express = require('express');
const request = require('supertest');

// Simular los modelos de MongoDB
jest.mock('../models/mongo', () => ({
    Order: {
        find: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        create: jest.fn(),
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

// La autorización RBAC se prueba por separado
jest.mock('../middlewares/authorize', () => ({
    authorize: () => (req, res, next) => next()
}));

jest.mock('../middlewares/ownerResolvers', () => ({
    orderOwner: jest.fn()
}));

const { Order } = require('../models/mongo');
const ordersRouter = require('../routes/orders');

const app = express();
app.use(express.json());
app.use('/api/orders', ordersRouter);

app.use((err, req, res, next) => {
    console.error('ERROR EN LA PRUEBA:', err.stack || err);

    res.status(500).json({
        message: err.message
    });
});

function queryConPopulate(valor) {
    const query = Promise.resolve(valor);
    query.populate = jest.fn().mockResolvedValue(valor);
    return query;
}

beforeEach(() => {
    jest.resetAllMocks();
});

describe('Orders API con mocks', () => {

    test('GET /api/orders responde 200', async () => {
        Order.find.mockReturnValue({
            populate: jest.fn().mockResolvedValue([
                { _id: 'orden1' }
            ])
        });

        const res = await request(app).get('/api/orders');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(Order.find).toHaveBeenCalled();
    });

    test('GET /api/orders/:id responde 404 si no existe', async () => {
        Order.findById.mockReturnValue(
            queryConPopulate(null)
        );

        const res = await request(app)
            .get('/api/orders/0123456789abcdef01234567');

        expect(res.statusCode).toBe(404);
    });

    test('POST /api/orders responde 201', async () => {
        const datos = {
            customerId: '0123456789abcdef01234567',
            items: [{
                productId: 20,
                quantity: 1,
                unitPrice: 500
            }],
            totals: {
                subtotal: 500,
                total: 500
            }
        };

        Order.create.mockResolvedValue({
            _id: 'ordenNueva',
            ...datos
        });

        const res = await request(app)
            .post('/api/orders')
            .send(datos);

        expect(res.statusCode).toBe(201);
        expect(Order.create).toHaveBeenCalledWith(datos);
    });

    test('PUT /api/orders/:id responde 200', async () => {
        const ordenActualizada = {
            _id: 'orden1',
            totals: {
                total: 600
            }
        };

        // Simular que la orden existe
        Order.findById.mockResolvedValue({
            _id: 'orden1'
        });

        // Simular la actualización en MongoDB
        Order.findByIdAndUpdate.mockResolvedValue(
            ordenActualizada
        );

        const res = await request(app)
            .put('/api/orders/orden1')
            .send({
                totals: {
                    total: 600
                }
            });

        expect(res.statusCode).toBe(200);

        expect(Order.findByIdAndUpdate)
            .toHaveBeenCalled();

        expect(Order.findByIdAndUpdate.mock.calls[0][0])
            .toBe('orden1');

        expect(Order.findByIdAndUpdate.mock.calls[0][1])
            .toEqual({
                totals: {
                    total: 600
                }
            });

        expect(res.body.data.totals.total).toBe(600);
    });


    test('DELETE /api/orders/:id responde 200', async () => {
        Order.findById.mockResolvedValue({
            _id: 'orden1'
        });

        Order.findByIdAndDelete.mockResolvedValue({
            _id: 'orden1'
        });

        const res = await request(app)
            .delete('/api/orders/orden1');

        expect(res.statusCode).toBe(200);
        expect(Order.findByIdAndDelete)
            .toHaveBeenCalledWith('orden1');
    });
});
