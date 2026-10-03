const { Sequelize } = require('sequelize');

//Conexion a MYSQL
const sequelize = new Sequelize(
    //Nombre de la base de datos
    'stride_co',
    //usuario de la base de datos
    'root',
    //Password de la base de datos
    'abcd1234',
    {
        //host: define la direccion del servidor de la base de datos
        host: 'localhost',
        //port: El puerto en el que atiende nuestro servidor de base de datos
        port: 3306,
        //dialect: es la propiedad donde definimos la base de datos especificamente que vamos a usar
        dialect: 'mysql',
        logging: false,
        define: {
            //Nos permite definir si queremos agregar automaticamente  a nuestros modelos las propiedades created_at, role_id
            underscored: true
        }
    }
);

module.exports = sequelize;