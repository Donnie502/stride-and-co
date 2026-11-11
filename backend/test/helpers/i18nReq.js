const i18n = require('../../config/i18n');

// funcion __ para los req falsos de las pruebas unitarias
// traduce siempre en ingles con en.json, igual que los textos que esperan las pruebas
function __(key, values) {
  return i18n.__({ phrase: key, locale: 'en' }, values);
}

module.exports = { __ };
