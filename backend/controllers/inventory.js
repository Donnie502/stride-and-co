const { Inventory } = require('../models/sql');

// CREATE
async function create(req, res, next) {
    try {
        const { variant_id, stock, reserved } = req.body;
        if (!variant_id || typeof variant_id !== 'number') {
            return res.status(400).json({ message: 'variant_id is required and must be a number`' });
        }
        if (stock !== undefined && (typeof stock !== 'number' || stock < 0)) {
            return res.status(400).json({ message: 'stock is required and must be a non-negative number' });
        }
        if (reserved !== undefined && (typeof reserved !== 'number' || reserved < 0)) {
            return res.status(400).json({ message: 'reserved is required and must be a non-negative number' });
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
        const id = req.params.id;
        const inventory = await Inventory.findByPk(id);
        
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
        const id = req.params.id;
        const { variant_id, stock, reserved } = req.body;

        const inventory = await Inventory.findByPk(id);
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory not found' });
        }

        let changes = {};
        if (variant_id !== undefined) {
            if (typeof variant_id !== 'number') {
                return res.status(400).json({ message: 'variant_id must be a number' });
            }
            changes.variant_id = variant_id;
        }
        if (stock !== undefined) {
            if (typeof stock !== 'number' || stock < 0) {
                return res.status(400).json({ message: 'stock must be a non-negative number' });
            }
            changes.stock = stock;
        }
        if (reserved !== undefined) {
            if (typeof reserved !== 'number' || reserved < 0) {
                return res.status(400).json({ message: 'reserved must be a non-negative number' });
            }
            changes.reserved = reserved;
        }

        await inventory.update(changes);
        res.status(200).json({ message: "Inventory updated", data: inventory });
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
            return res.status(404).json({ message: 'Inventory not found' });
        }

        await inventory.destroy();
        res.status(200).json({ message: "Inventory deleted", data: inventory });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, find, create, update, destroy };