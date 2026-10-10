const { Customer } = require('../models/documents');

// list
async function list(req, res) {
    const customers = await Customer.find();
    res.json({ message: 'GET customers', data: customers });
}

// find
async function find(req, res) {
    const customer = await Customer.findById(req.params.id);
    if (!customer) res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'GET customer by id', data: customer });
}

// create
async function create(req, res) {
    console.log(req.body);
    const customer = await Customer.create(req.body);
    res.status(201).json({ message: 'Customer created', data: customer });
}

// update
async function update(req, res) {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) res.status(404).json({ message: 'Customer not found' }); 
    res.json({ message: 'Customer updated', data: customer });
}

// destroy
async function destroy(req, res) {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted', data: {id: customer._id} });
}

module.exports = { list, find, create, update, destroy };