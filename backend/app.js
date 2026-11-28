var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const jwt = require('jsonwebtoken');
const { secret } = require('./config/jwt');

const i18n = require('./config/i18n');
const { errorHandler } = require('./middlewares/errorHandler');

var indexRouter = require('./routes/api/index');
var usersRouter = require('./routes/api/users');
var rolesRouter = require('./routes/api/roles');
const variantsRouter = require('./routes/api/variants');
const inventoryRouter = require('./routes/api/inventory');

const permissionsRouter = require('./routes/api/permissions');
const productsRouter = require('./routes/api/products');

const customersRouter = require('./routes/api/customers');
const ordersRouter = require('./routes/api/orders');

const authRouter = require('./routes/api/auth');
const indexWebRouter = require('./routes/web/index');
const authWebRouter = require('./routes/web/auth');

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

// Middleware global para detectar la cookie de sesión e inyectar currentUser a Pug
app.use((req, res, next) => {
  const token = req.cookies ? req.cookies.access_token : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, secret);
      res.locals.currentUser = decoded;
    } catch (err) {
      // Si el token expiró o es inválido, eliminamos la cookie vieja para limpiar la sesión
      res.clearCookie('access_token', { path: '/' });
      res.locals.currentUser = null;
    }
  } else {
    res.locals.currentUser = null;
  }
  next();
});

app.use('/', indexWebRouter);
app.use('/', authWebRouter);
app.use('/health', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/variants', variantsRouter);
app.use('/api/inventory', inventoryRouter);
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