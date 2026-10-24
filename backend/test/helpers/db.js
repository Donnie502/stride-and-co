const path = require('path');
const { execFileSync } = require('child_process');
const request = require('supertest');
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const config = require('config');

const app = require('../../app');
const { sequelize, Role, User } = require('../../models/relationals');
const { initAccessControl } = require('../../services/accessControl');
const { hashPassword } = require('../../utils/password');
const connectMongo = require('../../config/mongoose');

const PASSWORD = 'Prueba123';

// para no borrar nunca una bd que no sea de pruebas
function revisarBdDePrueba(nombre) {
  if (!String(nombre).endsWith('_test')) {
    throw new Error(`La bd "${nombre}" no termina en _test, se cancelan las pruebas`);
  }
}

// deja la bd de mysql limpia, con el seed y los permisos cargados
async function prepararBd() {
  const mysqlConfig = config.get('mysql');
  revisarBdDePrueba(mysqlConfig.database);

  // si la bd de pruebas no existe se crea
  const conn = await mysql.createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${mysqlConfig.database}\``);
  await conn.end();

  revisarBdDePrueba(sequelize.getDatabaseName());
  await sequelize.sync({ force: true });

  // se corre el seed del proyecto para llenar roles, permisos y role_permissions
  execFileSync(process.execPath, [path.join(__dirname, '../../seeders/rbac.js')], { env: process.env });

  // carga los permisos desde la bd igual que al arrancar la app
  await initAccessControl();
}

// conecta a mongo y deja la bd de pruebas vacia
async function prepararMongo() {
  await connectMongo();
  revisarBdDePrueba(mongoose.connection.name);
  await mongoose.connection.dropDatabase();
}

// crea un usuario con el rol que esta en la tabla roles
async function crearUsuario(nombreRol, email) {
  const role = await Role.findOne({ where: { name: nombreRol } });
  const { password_hash, salt_key } = await hashPassword(PASSWORD);

  return User.create({
    first_name: nombreRol,
    last_name: 'Prueba',
    email,
    role_id: role.id,
    password_hash,
    salt_key
  });
}

// saca el token con el login normal de la api
async function login(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.body.data.token;
}

module.exports = { revisarBdDePrueba, prepararBd, prepararMongo, crearUsuario, login };
