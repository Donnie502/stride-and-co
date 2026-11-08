const mongoose = require ('mongoose');
const config = require('config');

//Conexion a mongodb a partir de mongoose
//falta
function connectMongo(){
    // la URI es un secreto: viene de config/local-<NODE_ENV>.json (en pruebas, de config/test.json)
    const uri = config.get('mongo.uri');
    return mongoose.connect(uri);
}

module.exports = connectMongo;