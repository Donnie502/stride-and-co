// controllers/orders.js
const createError = require('http-errors');
const { Order } = require('../models/mongo');
const { checkObjectId, checkBody } = require('../utils/validation');

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

        // si faltan campos mongoose lanza ValidationError y el manejador central responde 400
        const order = await Order.create(req.body);
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

        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return next(notFound());
        }

        // runValidators para que tambien se validen los datos al actualizar
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
