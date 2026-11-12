const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const User = sequelize.define('User', {
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    password_hash: { type: DataTypes.STRING(100), allowNull: false },
    salt_key : { type: DataTypes.STRING(100), allowNull: false },
}, {
    tableName: 'users',
    timestamps: true, // -> created_at y updated_at
    // email unico: va como indice con nombre y no como unique: true en el campo,
    // porque sync({ alter: true }) volvia a agregar el UNIQUE en cada arranque.
    // con nombre, sync solo lo crea si no existe (tambien al correr el seed)
    indexes: [
        { name: 'users_email_unique', unique: true, fields: ['email'] }
    ]
});

User.prototype.toJSON = function () {
    const values = { ...this.get()}; //this.get() => [1,2,3] => 1, 2, 3
    delete values.password_hash;
    delete values.salt_key;

    return values;
};

module.exports = User;