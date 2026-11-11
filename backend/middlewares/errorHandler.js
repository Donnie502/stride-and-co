const mongoose = require('mongoose');
const { ValidationError: SequelizeValidationError, UniqueConstraintError, DatabaseError } = require('sequelize');
const { t } = require('../utils/translate');

// mensaje por defecto para cada codigo
const KEYS_BY_STATUS = {
    400: 'common.badRequest',
    401: 'auth.unauthorized',
    403: 'auth.forbidden',
    404: 'common.notFound',
    500: 'common.internal'
};

// codigos de postgres que vienen de un dato mal escrito, por ejemplo /api/users/abc
// 22P02: texto invalido para el tipo (abc en un id numerico)
// 22003: numero fuera de rango (99999999999 en un integer)
const PG_INVALID_INPUT = ['22P02', '22003'];

// sequelize guarda el error original de postgres en parent (y el mismo en original)
function pgCode(err) {
    return (err.parent && err.parent.code) || (err.original && err.original.code);
}

// decide el codigo http y la clave del mensaje segun el tipo de error
function resolveError(err) {
    // errores de mongoose
    if (err instanceof mongoose.Error.ValidationError) return { status: 400, key: 'common.validation' };
    if (err instanceof mongoose.Error.CastError) {
        return { status: 400, key: err.kind === 'ObjectId' ? 'common.invalidId' : 'common.validation' };
    }
    // campo unico repetido en mongo
    if (err && err.code === 11000) return { status: 400, key: 'common.duplicate' };

    // errores de sequelize, UniqueConstraintError hereda de ValidationError por eso va primero
    if (err instanceof UniqueConstraintError) return { status: 400, key: 'common.duplicate' };
    if (err instanceof SequelizeValidationError) return { status: 400, key: 'common.validation' };
    if (err instanceof DatabaseError && PG_INVALID_INPUT.includes(pgCode(err))) {
        return { status: 400, key: 'common.invalidId' };
    }

    // token invalido o sin token (express-jwt)
    if (err && err.name === 'UnauthorizedError') return { status: 401, key: 'auth.unauthorized' };

    // errores creados con http-errors, el controller puede mandar su propia clave en messageKey
    const status = err && (err.status || err.statusCode);
    if (status >= 400 && status < 500) {
        return { status, key: err.messageKey || KEYS_BY_STATUS[status] || 'common.badRequest' };
    }

    // todo lo demas es un error inesperado
    return { status: 500, key: 'common.internal' };
}

// manejador central: todos los next(err) terminan aqui
function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);

    const { status, key } = resolveError(err);
    const message = t(req, key);

    // los 500 se guardan en el log del servidor, al cliente solo le llega el mensaje generico
    if (status >= 500) console.error(err);

    // las rutas de la api responden json
    if (/^\/api(\/|\?|$)/.test(req.originalUrl)) {
        return res.status(status).json({ message });
    }

    // las demas rutas muestran la vista de error, el stack solo en development
    res.locals.message = message;
    res.locals.status = status;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(status);
    res.render('error');
}

module.exports = { errorHandler, resolveError };
