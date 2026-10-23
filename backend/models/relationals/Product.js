const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Product = sequelize.define('Product', {
    category_id: { type: DataTypes.INTEGER, allowNull: true }, // FK
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT },
    brand: { type: DataTypes.STRING(100) },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'products',
    timestamps: true
});

module.exports = Product;