const mongoose = require('mongoose');
const createError = require('http-errors');

// el body tiene que ser un objeto (no arreglo) con al menos un campo
function isValidBody(body) {
    return body !== null && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length > 0;
}

// regresa un error 400 si el id no es un ObjectId valido, si es valido regresa null
function checkObjectId(id) {
    if (mongoose.isValidObjectId(id)) return null;
    return createError(400, { messageKey: 'common.invalidId' });
}

// regresa un error 400 si el body no trae datos, si esta bien regresa null
function checkBody(body) {
    if (isValidBody(body)) return null;
    return createError(400, { messageKey: 'common.invalidBody' });
}

// quita del body los campos que el cliente no puede cambiar
// tambien quita operadores de mongo ($set, $push...) y rutas con punto como "userId.x"
// para que no se pueda saltar la regla por otro lado
function omitFields(body, fields) {
    const clean = {};
    for (const [key, value] of Object.entries(body)) {
        if (key.startsWith('$')) continue;
        if (fields.includes(key.split('.')[0])) continue;
        clean[key] = value;
    }
    return clean;
}

module.exports = { isValidBody, checkObjectId, checkBody, omitFields };
