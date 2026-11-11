const { Inventory } = require('../models/sql');

// CREATE
async function create(req, res, next) {
    try {
        const { variant_id, stock, reserved } = req.body;
        if (!variant_id || typeof variant_id !== 'number') {
            return res.status(400).json({ message: req.__('inventory.variantIdRequired') });
        }
        if (stock !== undefined && (typeof stock !== 'number' || stock < 0)) {
            return res.status(400).json({ message: req.__('inventory.stockRequired') });
        }
        if (reserved !== undefined && (typeof reserved !== 'number' || reserved < 0)) {
            return res.status(400).json({ message: req.__('inventory.reservedRequired') });
        }

        const newInventory = await Inventory.create({ variant_id, stock, reserved });
        res.status(201).json({ message: req.__('inventory.created'), data: newInventory });
    } catch (err) {
        next(err);
    }
}

// READ 
async function list(req, res, next) {
    try {
        const inventory = await Inventory.findAll();
        res.status(200).json({ message: req.__('inventory.list'), data: inventory });
    } catch (err) {
        next(err);
    }
}

// READ
async function find(req, res, next) {
    try {
        const id = req.params.id;
        const inventory = await Inventory.findByPk(id);
        
        if (!inventory) {
            return res.status(404).json({ message: req.__('inventory.notFound') });
        }
        res.status(200).json({ message: req.__('inventory.found'), data: inventory });
    } catch (err) {
        next(err);
    }
}

// UPDATE
async function update(req, res, next) {
    try {
        const id = req.params.id;
        const { variant_id, stock, reserved } = req.body;

        const inventory = await Inventory.findByPk(id);
        if (!inventory) {
            return res.status(404).json({ message: req.__('inventory.notFound') });
        }

        let changes = {};
        if (variant_id !== undefined) {
            if (typeof variant_id !== 'number') {
                return res.status(400).json({ message: req.__('inventory.variantIdInvalid') });
            }
            changes.variant_id = variant_id;
        }
        if (stock !== undefined) {
            if (typeof stock !== 'number' || stock < 0) {
                return res.status(400).json({ message: req.__('inventory.stockInvalid') });
            }
            changes.stock = stock;
        }
        if (reserved !== undefined) {
            if (typeof reserved !== 'number' || reserved < 0) {
                return res.status(400).json({ message: req.__('inventory.reservedInvalid') });
            }
            changes.reserved = reserved;
        }

        await inventory.update(changes);
        res.status(200).json({ message: req.__('inventory.updated'), data: inventory });
    } catch (err) {
        next(err);
    }
}

// DELETE
async function destroy(req, res, next) {
    try {
        const id = req.params.id;
        const inventory = await Inventory.findByPk(id);
        if (!inventory) {
            return res.status(404).json({ message: req.__('inventory.notFound') });
        }

        await inventory.destroy();
        res.status(200).json({ message: req.__('inventory.deleted'), data: inventory });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, find, create, update, destroy };