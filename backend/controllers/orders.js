// controllers/orders.js
const createError = require('http-errors');
const { Order } = require('../models/mongo');
const { checkObjectId, checkBody, omitFields } = require('../utils/validation');

// campos que el cliente no puede cambiar con PUT
const RESTRICTED_ON_UPDATE = ['userId', 'customerId', 'statusHistory'];

// error 404 cuando no existe la orden
const notFound = () => createError(404, { messageKey: 'orders.notFound' });

// list
async function list(req, res, next) {
    try {
        const orders = await Order.find().populate('customerId');
        res.json({ message: req.__('orders.list'), data: orders });
    } catch (err) {
        next(err);
    }
}

// find
async function find(req, res, next) {
    try {
        const idError = checkObjectId(req.params.id);
        if (idError) return next(idError);

        // traemos tambien los datos del cliente
        const order = await Order.findById(req.params.id).populate('customerId');

        if (!order) {
            return next(notFound());
        }

        res.json({ message: req.__('orders.found'), data: order });
    } catch (err) {
        next(err);
    }
}

// create
async function create(req, res, next) {
    try {
        const bodyError = checkBody(req.body);
        if (bodyError) return next(bodyError);

        // el historial inicial lo pone el servidor, se ignora el statusHistory del body
        const data = {
            ...req.body,
            statusHistory: [{ status: 'PENDING', changedById: req.user.id }]
        };

        // si faltan campos mongoose lanza ValidationError y el manejador central responde 400
        const order = await Order.create(data);
        res.status(201).json({ message: req.__('orders.created'), data: order });
    } catch (err) {
        next(err);
    }
}

// update
async function update(req, res, next) {
    try {
        const idError = checkObjectId(req.params.id);
        if (idError) return next(idError);

        const bodyError = checkBody(req.body);
        if (bodyError) return next(bodyError);

        // userId, customerId y statusHistory no se pueden cambiar
        const changes = omitFields(req.body, RESTRICTED_ON_UPDATE);
        const changesError = checkBody(changes);
        if (changesError) return next(changesError);

        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return next(notFound());
        }

        // runValidators para que tambien se validen los datos al actualizar
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
        res.json({ message: req.__('orders.updated'), data: updatedOrder });
    } catch (err) {
        next(err);
    }
}

// destroy
async function destroy(req, res, next) {
    try {
        const idError = checkObjectId(req.params.id);
        if (idError) return next(idError);

        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return next(notFound());
        }

        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: req.__('orders.deleted'), data: { id: req.params.id } });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, find, create, update, destroy };
