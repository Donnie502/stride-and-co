var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const jwt = require('jsonwebtoken');
const { secret, issuer, audience } = require('./config/jwt');
const { User } = require('./models/sql');
const { checkPermission } = require('./services/accessControl');

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

// Middleware global para detectar la cookie de sesión, inyectar currentUser y helper can() a Pug
app.use(async (req, res, next) => {
  res.locals.currentUser = null;
  res.locals.can = () => false;

  const token = req.cookies ? req.cookies.access_token : null;
  if (token) {
    try {
      // 1. Verificación JWT unificada con los mismos parámetros de la API 
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer,
        audience
      });

      // 2. Consulta a BD para validar usuario activo e inyectar datos reales 
      const user = await User.findByPk(decoded.sub);
      if (user && user.active) {
        req.user = user;
        res.locals.currentUser = user;
        
        // 3. Helper de permisos para Pug
        res.locals.can = (resource, action, possession = 'any') => {
          const result = checkPermission({
            roleId: user.role_id,
            resource,
            action,
            possession
          });
          return result.granted;
        };
      } else {
        res.clearCookie('access_token');
      }
    } catch {
     
      res.clearCookie('access_token');
    }
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