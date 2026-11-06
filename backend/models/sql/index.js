const sequelize = require('../../config/sequelize');
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const Product = require('./Product');
const ProductVariant = require('./ProductVariant');
const Inventory = require('./Inventory');

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

// Product 1 -----> N ProductVariant
Product.hasMany(ProductVariant, { foreignKey: 'product_id', as:'variants' });

// ProductVariant -> Product
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as:'product' });

// ProductVariant 1 -----> 1 Inventory
ProductVariant.hasOne(Inventory, { foreignKey: 'variant_id', as:'inventory' });

// Inventory -> ProductVariant
Inventory.belongsTo(ProductVariant, { foreignKey: 'variant_id', as:'product_variant' });

module.exports = { sequelize, User, Role, Permission, Product, ProductVariant,   Inventory };
