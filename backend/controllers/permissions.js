const Permission = require('../models/sql/Permission');

// CREATE
async function create(req, res, next) {
    try {
        const key = req.body.key;
        const description = req.body.description;
        
        // Validación para asegurar que el key no venga vacío
        if (!key || typeof key !== 'string' || key.trim() === '') {
            return res.status(400).json({ message: req.__('permissions.keyRequired') });
        }
        
        const permission = await Permission.create({ 
            key: key.trim(), 
            description: description 
        });
        
        res.status(201).json({
            message: req.__('permissions.created'),
            data: permission
        });
    } catch (err) {
        next(err);
    }
}

// READ
async function list(req, res, next) {
    try {
        const permissions = await Permission.findAll();
        res.json({
            message: req.__('permissions.list'),
            data: permissions
        });
    } catch (err) {
        next(err);
    }
}

async function find(req, res, next) {
    try {
        const id = req.params.id;
        const permission = await Permission.findByPk(id);
        
        if(!permission) return res.status(404).json({ message: req.__('permissions.notFound') });
        
        res.json({
            message: req.__('permissions.found'),
            data: permission
        });   
    } catch (err) {
        next(err);
    }
}

// UPDATE
async function update(req, res, next) {
    try {
        const id = req.params.id;
        const key = req.body.key;
        const description = req.body.description;
        
        const permission = await Permission.findByPk(id);
        if(!permission) return res.status(404).json({ message: req.__('permissions.notFound') });
        
        let changes = {};
        if (key !== undefined) {
            if (typeof key !== 'string' || key.trim() === '') {
                return res.status(400).json({ message: req.__('permissions.keyInvalid') });
            }
            changes.key = key.trim();
        }
        if (description !== undefined) {
            changes.description = description;
        }

        await permission.update(changes);

        res.json({
            message: req.__('permissions.updated'),
            data: permission
        });
    } catch (err) {
        next(err);
    }
}

// DELETE
async function destroy(req, res, next) {
    try {
        const id = req.params.id;
        const permission = await Permission.findByPk(id);
        
        if(!permission) return res.status(404).json({ message: req.__('permissions.notFound') });
        
        await permission.destroy();
        res.json({
            message: req.__('permissions.deleted'),
            data: permission
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, create, find, update, destroy };