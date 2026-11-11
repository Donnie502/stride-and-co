const i18n = require('../config/i18n');

// traduce una clave con el idioma de la peticion
// si la peticion no paso por i18n.init (por ejemplo en una app de prueba) usa el idioma por defecto
function t(req, key, values) {
    if (req && typeof req.__ === 'function') return req.__(key, values);
    return i18n.__(key, values);
}

module.exports = { t };
