const Permission = require('../models/relationals/Permission');

// CREATE
async function create(req, res, next) {
    const key = req.body.key;
    const description = req.body.description;
    
    // Validación para asegurar que el key no venga vacío
    if (!key) {
        return res.status(400).json({ message: 'key is required' });
    }
    
    const permission = await Permission.create({ key: key, description: description });
    
    res.status(201).json({
        message: "Permission created",
        data: permission
    });
}

// READ
async function list(req, res, next) {
    const permissions = await Permission.findAll();
    res.json({
        message: "Permissions list",
        data: permissions
    });
}

async function find(req, res, next) {
    const id = req.params.id;
    const permission = await Permission.findByPk(id);
    
    if(!permission) return res.status(404).json({ message: 'Permission not found' });
    
    res.json({
        message: "Permission by id",
        data: permission
    });   
}

// UPDATE
async function update(req, res, next) {
    const id = req.params.id;
    const key = req.body.key;
    const description = req.body.description;
    
    const permission = await Permission.findByPk(id);
    if(!permission) return res.status(404).json({ message: 'Permission not found' });
    
    let changes = {};
    changes.key = key ? key : permission.key;
    changes.description = description ? description : permission.description;

    await permission.update(changes);

    res.json({
        message: "Permission updated",
        data: permission
    });
}

// DELETE
async function destroy(req, res, next) {
    const id = req.params.id;
    const permission = await Permission.findByPk(id);
    
    if(!permission) return res.status(404).json({ message: 'Permission not found' });
    
    await permission.destroy();
    res.json({
        message: "Permission deleted",
        data: permission
    });
}

module.exports = { list, create, find, update, destroy };