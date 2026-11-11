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

module.exports = { isValidBody, checkObjectId, checkBody };
