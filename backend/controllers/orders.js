// controllers/orders.js
const { Order } = require('../models/documents');

// list
async function list(req, res, next) {
    try {
        const orders = await Order.find().populate('customerId');
        res.json({ message: 'GET orders', data: orders });
    } catch (err) {
        next(err);
    }
}

// find
async function find(req, res, next) {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Validación del alcance 'own' verificando la pertenencia real del recurso
        if (order.customerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Forbidden: No tienes permiso para operar sobre este recurso' });
        }

        res.json({ message: 'GET order by id', data: order });
    } catch (err) {
        next(err);
    }
}

// create
async function create(req, res, next) {
    try {
        const order = await Order.create(req.body);
        res.status(201).json({ message: 'Order created', data: order });
    } catch (err) {
        next(err);
    }
}

// update
async function update(req, res, next) {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Validación del alcance 'own' verificando la pertenencia real del recurso
        if (order.customerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Forbidden: No tienes permiso para operar sobre este recurso' });
        }

        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: 'Order updated', data: updatedOrder });
    } catch (err) {
        next(err);
    }
}

// destroy
async function destroy(req, res, next) {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Validación del alcance 'own' verificando la pertenencia real del recurso
        if (order.customerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Forbidden: No tienes permiso para operar sobre este recurso' });
        }

        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Order deleted', data: { id: req.params.id } });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, find, create, update, destroy };