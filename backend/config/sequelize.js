const { Sequelize } = require('sequelize');
const config = require('config');

const mysqlConfig = config.get("mysql");
//Conexion a MYSQL
const sequelize = new Sequelize(
    //Nombre de la base de datos
    mysqlConfig.database,
    //usuario de la base de datos
    mysqlConfig.user,
    //Password de la base de datos
    mysqlConfig.password,
    {
        //host: define la direccion del servidor de la base de datos
        host: mysqlConfig.host,
        //port: El puerto en el que atiende nuestro servidor de base de datos
        port: mysqlConfig.port,
        //dialect: es la propiedad donde definimos la base de datos especificamente que vamos a usar
        dialect: 'mysql',
        logging: false,
        define: {
            //Nos permite definir si queremos agregar automaticamente  a nuestros modelos las propiedades created_at, role_id
            underscored: true
        }
    }
);

console.log("app conectada a la base de datos: " + mysqlConfig.database + " en el host: " + mysqlConfig.host + ":" + mysqlConfig.port);

module.exports = sequelize;