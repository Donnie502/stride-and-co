const { Inventory } = require('../models/relationals');

// CREATE
async function create(req, res, next) {
    try {
        const { variant_id, stock, reserved } = req.body;
        if (!variant_id) {
            return res.status(400).json({ message: 'variant_id is required' });
        }

        const newInventory = await Inventory.create({ variant_id, stock, reserved });
        res.status(201).json({ message: "Inventory created", data: newInventory });
    } catch (err) {
        next(err);
    }
}

// READ 
async function list(req, res, next) {
    try {
        const inventory = await Inventory.findAll();
        res.status(200).json({ message: "Inventory list", data: inventory });
    } catch (err) {
        next(err);
    }
}

// READ
async function find(req, res, next) {
    try {
        const inventory = await Inventory.findByPk(req.params.id);
        
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory not found' });
        }
        res.status(200).json({ message: "Inventory by id", data: inventory });
    } catch (err) {
        next(err);
    }
}

// UPDATE
async function update(req, res, next) {
    try {
        const inventory = await Inventory.findByPk(req.params.id);
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory not found' });
        }

        await inventory.update(req.body);
        res.status(200).json({ message: "Inventory updated", data: inventory });
    } catch (err) {
        next(err);
    }
}

// DELETE
async function destroy(req, res, next) {
    try {
        const inventory = await Inventory.findByPk(req.params.id);
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory not found' });
        }

        await inventory.destroy();
        res.status(200).json({ message: "Inventory deleted", data: inventory });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, find, create, update, destroy };