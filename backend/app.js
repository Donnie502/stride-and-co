var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const i18n = require('./config/i18n');
const { errorHandler } = require('./middlewares/errorHandler');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var rolesRouter = require('./routes/roles');
const variantsRouter = require('./routes/variants');
const inventoryRouter = require('./routes/inventory');

const permissionsRouter = require('./routes/permissions');
const productsRouter = require('./routes/products');

const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');

const authRouter = require('./routes/auth');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
// i18n va antes de leer el body para que un json mal formado tambien se traduzca
app.use(i18n.init);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/variants',variantsRouter);
app.use('/api/inventory',inventoryRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// manejador central de errores (401 del token, validaciones, 404, 500...)
app.use(errorHandler);

module.exports = app;
