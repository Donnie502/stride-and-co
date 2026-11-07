const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Permission = sequelize.define('Permission', {
    key: { type: DataTypes.STRING(100), allowNull: false},
    description: { type: DataTypes.STRING(255), allowNull: true }
}, {
    tableName: 'permissions',
    timestamps: true
});

module.exports = Permission;