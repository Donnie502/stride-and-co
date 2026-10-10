const mongoose = require ('mongoose');

//Conexion a mongodb a partir de mongoose
//falta
function connectMongo(){
    const uri = "mongodb://localhost:27017/stride_co";
    return mongoose.connect(uri);
}

module.exports = connectMongo;