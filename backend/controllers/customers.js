const { Customer } = require('../models/documents');

// list
async function list(req, res, next) {
    try {
        const customers = await Customer.find();
        res.json({ message: 'GET customers', data: customers });
    } catch (err) {
        next(err);
    }
}

// find
async function find(req, res, next) {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        
        res.json({ message: 'GET customer by id', data: customer });
    } catch (err) {
        next(err);
    }
}

// create
async function create(req, res, next) {
    try {
        const customer = await Customer.create(req.body);
        res.status(201).json({ message: 'Customer created', data: customer });
    } catch (err) {
        next(err);
    }
}

// update
async function update(req, res, next) {
    try {
        //Buscamos el documento original primero
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' }); 

        //Validación own: Comprobamos la pertenencia real del recurso
        if (customer.userId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Forbidden: No puedes modificar el perfil de otro cliente' });
        }

        //Si es el dueño aplicamos los cambios
        const updatedCustomer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json({ message: 'Customer updated', data: updatedCustomer });
    } catch (err) {
        next(err);
    }
}

// destroy
async function destroy(req, res, next) {
    try {
        //Buscamos el documento original primero
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        //Validación own: Comprobamos la pertenencia real del recurso
        if (customer.userId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Forbidden: No puedes eliminar el perfil de otro cliente' });
        }

        //Si es el dueño eliminamos el recurso
        await Customer.findByIdAndDelete(req.params.id);
        res.json({ message: 'Customer deleted', data: { id: customer._id } });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, find, create, update, destroy };