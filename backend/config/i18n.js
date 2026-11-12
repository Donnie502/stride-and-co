const path = require('path');
const i18n = require('i18n');

// orden para elegir idioma: ?lang, luego Accept-Language y al final el defecto
// (ya no se lee cookie)
i18n.configure({
    locales: ['es', 'en'],
    defaultLocale: 'en',
    directory: path.join(__dirname, '..', 'locales'),
    queryParameter: 'lang',
    header: 'accept-language',
    objectNotation: true,
    // variantes regionales como ?lang=es-MX usan es
    fallbacks: { 'es-*': 'es' },
    // para que la libreria no escriba claves nuevas en los json
    updateFiles: false
});

module.exports = i18n;
