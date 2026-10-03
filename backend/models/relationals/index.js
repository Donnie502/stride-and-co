const sequelize = require('../../config/sequelize');
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');

// Role 1 -----> N Users
Role.hasMany(User, { foreignKey: 'role_id', as:'users' });

//User -> Rol
User.belongsTo(Role, { foreignKey: 'role_id', as:'role' });

//Role N -------> N Permission
Role.belongsToMany(Permission, { 
    through: 'role_permissions', //Tabla intermedia 
    foreignKey: 'role_id', //Llave foranea del modelo principal
    otherKey:'permission_id', //La otra llave foranea
    as:'permissions', //Plural del segundo modelo
    timestamps: false
});

Permission.belongsToMany(Role, { 
    through: 'role_permissions',
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as:'roles',
    timestamps: false 
});

module.exports = { sequelize, User, Role, Permission };