const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Inventory = sequelize.define('Inventory', {
    variant_id: { type: DataTypes.INTEGER, allowNull: false, unique: true }, // FK
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    reserved: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    tableName: 'inventory',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Inventory;