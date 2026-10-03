const { Role, Permission } = require('../models/relationals');

// CREATE
async function create(req, res, next) {
    try {
        const role = await Role.create(req.body);
        if (req.body.permissionIds) {
            await role.setPermissions(req.body.permissionIds);
        }
        res.status(201).json({ message: 'Role created', data: role });
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
        res.json({ message: "Roles list", data: roles });
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
        
        if (!role) return res.status(404).json({ message: 'Role not found' });
        
        res.json({ message: "Role by id", data: role });   
    } catch (err) {
        next(err);
    }
}

// UPDATE
async function update(req, res, next) {
    try {
        const id = req.params.id;
        const role = await Role.findByPk(id);
        
        if (!role) return res.status(404).json({ message: 'Role not found' });
        
        // Actualizamos los datos básicos del rol
        await role.update(req.body);

        // Si la petición incluye nuevos permisos, actualizamos la relación N:N
        if (req.body.permissionIds) {
            await role.setPermissions(req.body.permissionIds);
        }

        res.json({ message: "Role updated", data: role });
    } catch (err) {
        next(err);
    }
}

// DELETE
async function destroy(req, res, next) {
    try {
        const id = req.params.id;
        const role = await Role.findByPk(id);
        
        if (!role) return res.status(404).json({ message: 'Role not found' });
        
        await role.destroy();
        res.json({ message: "Role deleted", data: role });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, create, find, update, destroy };