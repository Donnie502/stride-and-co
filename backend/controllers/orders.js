// controllers/orders.js
const { Order } = require('../models/documents');

// list
async function list(req, res) {
    const orders = await Order.find().populate('customerId');
    res.json({ message: 'GET orders', data: orders });
}

// find
function find(req, res) {
    res.json({ message: 'GET order by id', data: { id: req.params.id } });
}

// create
async function create(req, res) {
    const order = await Order.create(req.body);
    res.status(201).json({ message: 'Order created', data: order });
}

// update
function update(req, res) {
    res.json({ message: 'Order updated', data: { id: req.params.id, ...req.body } });
}

// destroy
function destroy(req, res) {
    res.json({ message: 'Order deleted', data: { id: req.params.id } });
}

module.exports = { list, find, create, update, destroy };