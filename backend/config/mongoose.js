const mongoose = require ('mongoose');

//Conexion a mongodb a partir de mongoose
//falta
function connectMongo(){
    // en pruebas se usa MONGO_URI para no tocar la bd normal
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/stride_co";
    return mongoose.connect(uri);
}

module.exports = connectMongo;