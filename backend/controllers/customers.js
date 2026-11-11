const createError = require('http-errors');
const { Customer } = require('../models/mongo');
const { checkObjectId, checkBody, omitFields } = require('../utils/validation');

// campos que el cliente no puede cambiar con PUT
const RESTRICTED_ON_UPDATE = ['userId'];

// error 404 cuando no existe el cliente
const notFound = () => createError(404, { messageKey: 'customers.notFound' });

// list
async function list(req, res, next) {
    try {
        const customers = await Customer.find();
        res.json({ message: req.__('customers.list'), data: customers });
    } catch (err) {
        next(err);
    }
}

// find
async function find(req, res, next) {
    try {
        const idError = checkObjectId(req.params.id);
        if (idError) return next(idError);

        const customer = await Customer.findById(req.params.id);
        if (!customer) return next(notFound());

        res.json({ message: req.__('customers.found'), data: customer });
    } catch (err) {
        next(err);
    }
}

// create
async function create(req, res, next) {
    try {
        const bodyError = checkBody(req.body);
        if (bodyError) return next(bodyError);

        // el dueño siempre es el usuario del token, se ignora el userId del body
        const data = { ...req.body, userId: req.user.id };

        // si hay datos invalidos mongoose lanza ValidationError y el manejador central responde 400
        const customer = await Customer.create(data);
        res.status(201).json({ message: req.__('customers.created'), data: customer });
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

        // userId no se puede cambiar, si solo mandaron eso no queda nada que actualizar
        const changes = omitFields(req.body, RESTRICTED_ON_UPDATE);
        const changesError = checkBody(changes);
        if (changesError) return next(changesError);

        //Buscamos el documento original primero
        const customer = await Customer.findById(req.params.id);
        if (!customer) return next(notFound());

        //El dueño ya lo revisa authorize en la ruta
        const updatedCustomer = await Customer.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
        res.json({ message: req.__('customers.updated'), data: updatedCustomer });
    } catch (err) {
        next(err);
    }
}

// destroy
async function destroy(req, res, next) {
    try {
        const idError = checkObjectId(req.params.id);
        if (idError) return next(idError);

        //Buscamos el documento original primero
        const customer = await Customer.findById(req.params.id);
        if (!customer) return next(notFound());

        //El dueño ya lo revisa authorize en la ruta
        await Customer.findByIdAndDelete(req.params.id);
        res.json({ message: req.__('customers.deleted'), data: { id: customer._id } });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, find, create, update, destroy };
