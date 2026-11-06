
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const ProductVariant = sequelize.define('ProductVariant', {
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    sku: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    size: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },
    color: {
        type: DataTypes.STRING(30),
        allowNull: false,
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'product_variants',
    timestamps: true,
    underscored: true,
});

module.exports = ProductVariant;
