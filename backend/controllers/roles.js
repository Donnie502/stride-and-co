const { Role, Permission } = require('../models/sql');

// CREATE
async function create(req, res, next) {
    try {
        const { name, description, permissionIds } = req.body;
        if (!name || !description) {
            return res.status(400).json({ message: req.__('roles.requiredFields') });
        }
        if (typeof name !== 'string') {
            return res.status(400).json({ message: req.__('roles.nameNotString') });
        }

        const role = await Role.create({ name, description });
        if (permissionIds && Array.isArray(permissionIds)) {
            await role.setPermissions(permissionIds);
        }
        res.status(201).json({ message: req.__('roles.created'), data: role });
    } catch (err) {
        next(err);
    }
}

// READ
async function list(req, res, next) {
    try {
        const roles = await Role.findAll({
            include: { 
                model: Permission, 
                as: 'permissions'
            }
        });
        res.json({ message: req.__('roles.list'), data: roles });
    } catch (err) {
        next(err);
    }
}

async function find(req, res, next) {
    try {
        const id = req.params.id;
        const role = await Role.findByPk(id, {
            include: { 
                model: Permission, 
                as: 'permissions' // <--- Coincide con tu index.js
            }
        });
        
        if (!role) return res.status(404).json({ message: req.__('roles.notFound') });
        
        res.json({ message: req.__('roles.found'), data: role });   
    } catch (err) {
        next(err);
    }
}

// UPDATE
async function update(req, res, next) {
    try {
        const id = req.params.id;
        const { name, description, permissionIds } = req.body;

        const role = await Role.findByPk(id);
        
        if (!role) return res.status(404).json({ message: req.__('roles.notFound') });
        
        if (name !== undefined) {
            if (!name || typeof name !== 'string') {
                return res.status(400).json({ message: req.__('roles.nameInvalid') });
            }
        }

        let changes = {};
        if (name !== undefined) changes.name = name;
        if (description !== undefined) changes.description = description;

        // Actualizamos los datos básicos del rol
        await role.update(changes);

        // Si la petición incluye nuevos permisos, actualizamos la relación N:N
        if (permissionIds && Array.isArray(permissionIds)) {
            await role.setPermissions(permissionIds);
        }

        res.json({ message: req.__('roles.updated'), data: role });
    } catch (err) {
        next(err);
    }
}

// DELETE
async function destroy(req, res, next) {
    try {
        const id = req.params.id;
        const role = await Role.findByPk(id);
        
        if (!role) return res.status(404).json({ message: req.__('roles.notFound') });
        
        await role.destroy();
        res.json({ message: req.__('roles.deleted'), data: role });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, create, find, update, destroy };