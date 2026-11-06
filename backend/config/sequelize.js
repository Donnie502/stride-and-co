const { Sequelize } = require('sequelize');
const config = require('config');

const dbConfig = config.get("postgres");
//Conexion a POSTGRES
const sequelize = new Sequelize(
    //Nombre de la base de datos
    dbConfig.database,
    //usuario de la base de datos
    dbConfig.user,
    //Password de la base de datos
    dbConfig.password,
    {
        //host: define la direccion del servidor de la base de datos
        host: dbConfig.host,
        //port: El puerto en el que atiende nuestro servidor de base de datos
        port: dbConfig.port,
        //dialect: es la propiedad donde definimos la base de datos especificamente que vamos a usar
        dialect: 'postgres',
        logging: false,
        define: {
            //Nos permite definir si queremos agregar automaticamente  a nuestros modelos las propiedades created_at, role_id
            underscored: true
        }
    }
);

console.log("app conectada a la base de datos: " + dbConfig.database + " en el host: " + dbConfig.host + ":" + dbConfig.port);

module.exports = sequelize;