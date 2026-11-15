# Stride & Co. - Sistema de Gestión y Ventas

**Proyecto Integrador — Entregable 2 | Desarrollo de Aplicaciones Web | UACH, Facultad de Ingeniería**

## Descripción del proyecto

Stride & Co. busca digitalizar el catálogo de productos, inventario, clientes y órdenes de compra. El backend implementa una API REST con Node.js y Express, PostgreSQL mediante Sequelize y MongoDB mediante Mongoose. El segundo entregable incorpora CRUD de los ocho recursos, autenticación JWT, autorización RBAC, internacionalización en español e inglés, configuración por entornos, despliegue en Render y pruebas automatizadas con Jest y Supertest.

- Rama de entrega: [`staging`](https://github.com/Donnie502/stride-and-co/tree/staging).
- API pública: <https://stride-and-co-o8i1.onrender.com/>.
- Health check: <https://stride-and-co-o8i1.onrender.com/health>.
- Verificación del 15 de noviembre de 2026: 319 pruebas con mocks y 112 E2E aprobadas tanto localmente como en Render.

## Integrantes del Equipo (Scrum)

* **Ezequiel Adolfo Herrera Hernandez** (385717) - Product Owner
* **Carlos Alberto Díaz Sánchez** (385539) - Scrum Master
* **Edgar Alejandro Gutierrez Carrillo** (385655) - Developer
* **Diego Ivan Ibarra Lozoya** (373781) - Developer

## Arquitectura y persistencia

```text
Cliente HTTP -> Express -> i18n -> authenticate (JWT) -> authorize (RBAC)
                                      -> Controller -> Sequelize -> PostgreSQL
                                                    -> Mongoose  -> MongoDB
                                      -> Respuesta JSON / manejador de errores
```

| Recurso | Base de datos | Modelo |
|---|---|---|
| Users | PostgreSQL | User |
| Roles | PostgreSQL | Role |
| Permissions | PostgreSQL | Permission |
| Products | PostgreSQL | Product |
| Variants | PostgreSQL | ProductVariant |
| Inventory | PostgreSQL | Inventory |
| Customers | MongoDB | Customer |
| Orders | MongoDB | Order |

Los modelos están en `backend/models/sql/` y `backend/models/mongo/`. Las asociaciones principales son User → Role, Role ↔ Permission (role_permissions), Product → ProductVariant, ProductVariant → Inventory y Order → Customer. Las consultas utilizan `include` o `populate` cuando corresponde. Las órdenes utilizan Decimal128 para sus importes; el inventario conserva stock y reservas.

## Preparación local con contenedores propios

### 1. Requisitos e instalación

Instalar Git, Docker y una versión actual de Node.js 22 con npm. Las bases de datos se ejecutan en Docker y la API en la computadora del desarrollador.

```bash
git clone -b staging https://github.com/Donnie502/stride-and-co.git
cd stride-and-co/backend
npm ci
```

Todos los comandos npm de esta guía se ejecutan desde `backend/`. Si el repositorio ya existe, actualizar `staging` con `git pull --ff-only origin staging` después de comprobar que no hay cambios locales pendientes.

### 2. Crear PostgreSQL y MongoDB

Los usuarios y contraseñas de esta sección son ejemplos ficticios exclusivos para desarrollo. No reutilizarlos en producción.

```bash
docker volume create stride-postgres-data
docker run -d \
  --name stride-postgres \
  -e POSTGRES_DB=stride_co \
  -e POSTGRES_USER=stride \
  -e POSTGRES_PASSWORD='StrideLocal2026!' \
  -p 127.0.0.1:5432:5432 \
  -v stride-postgres-data:/var/lib/postgresql/data \
  postgres:16

docker volume create stride-mongo-data
docker run -d \
  --name stride-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=stride_demo \
  -e MONGO_INITDB_ROOT_PASSWORD='MongoLocal2026!' \
  -p 127.0.0.1:27027:27017 \
  -v stride-mongo-data:/data/db \
  mongo:7.0
```

Si los contenedores ya existen, utilizar `docker start stride-postgres stride-mongo`. Ajustar los nombres, puertos y credenciales si se reutilizan otras instancias. Las variables de inicialización de Docker solo crean credenciales cuando el volumen está vacío.

Comprobar disponibilidad:

```bash
docker ps
docker exec stride-postgres pg_isready -U stride -d stride_co
docker exec stride-mongo mongosh --quiet \
  --username stride_demo --password 'MongoLocal2026!' \
  --authenticationDatabase admin --eval 'db.adminCommand({ ping: 1 })'
```

### 3. Configurar los secretos locales

```bash
cp -n config/local-development.example.json config/local-development.json
chmod 600 config/local-development.json
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Editar `config/local-development.json` con las conexiones reales de desarrollo y el secreto generado en el paso anterior. Ejemplo para los contenedores de esta guía:

```json
{
  "postgres": {
    "host": "127.0.0.1",
    "port": 5432,
    "database": "stride_co",
    "user": "stride",
    "password": "StrideLocal2026!"
  },
  "mongo": {
    "uri": "mongodb://stride_demo:MongoLocal2026%21@127.0.0.1:27027/stride_co?authSource=admin"
  },
  "jwt": {
    "secret": "REEMPLAZAR_CON_EL_SECRETO_GENERADO"
  }
}
```

`authSource=admin` identifica la base donde se creó el usuario de MongoDB. El carácter `!` de la contraseña de ejemplo se codifica como `%21` en la URI. No publicar el archivo local ni sus copias. La plantilla `.example.json` sí forma parte del repositorio.

### 4. Cargar datos e iniciar la API

```bash
NODE_ENV=development npm run seed
NODE_ENV=development npm start
```

El seed debe finalizar con `Seed completo: roles, permisos y datos de demostración disponibles.` El servidor escucha en el puerto 3000 por defecto. Para recarga automática puede usarse `NODE_ENV=development npm run dev`.

En otra terminal:

```bash
curl -i http://localhost:3000/health
```

Respuesta esperada: HTTP 200 y `{"status":"UP"}`. La sección [Autenticación](#autenticación) explica cómo iniciar sesión.

### Problemas frecuentes

| Error | Solución |
|---|---|
| ECONNREFUSED | Encender los contenedores y revisar host y puerto. |
| Password authentication failed / client password must be a string | Configurar las credenciales PostgreSQL en local-development.json. |
| Authentication failed en MongoDB | Revisar URI, usuario, contraseña y authSource. |
| Falta jwt.secret | Configurar el secreto JWT en el archivo local. |
| Please install pg package manually | Ejecutar npm ci en backend/. |
| Puerto ocupado | Ajustar el puerto publicado por Docker y la configuración. |

## Configuración por entornos y secretos

Se utiliza la librería `config` (versión 4). La configuración se obtiene con `config.get()`. `NODE_ENV` selecciona development, test o production; `PORT` se mapea a `server.port`. `E2E_BASE_URL` se reserva para el runner E2E y se mapea a `e2e.baseUrl`.

| Archivo en backend/config/ | Función | Git |
|---|---|---|
| default.json | Valores generales no secretos | Sí |
| production.json | Ajustes no secretos de producción | Sí |
| test.json | Valores ficticios para pruebas sin bases reales | Sí |
| custom-environment-variables.json | Mapeos PORT y E2E_BASE_URL | Sí |
| local-development.example.json | Plantilla local | Sí |
| local-production.example.json | Plantilla de producción | Sí |
| local-development.json | Conexiones y secreto JWT local | No |
| local-production.json | Conexiones y secreto JWT de producción | No |
| local-test.json | Ajustes locales opcionales de test; no necesarios para mocks | No |

`.gitignore` y `.dockerignore` excluyen `backend/config/local*.json`, excepto las plantillas `*.example.json`. No se guardan URIs privadas, contraseñas de bases de datos ni secretos JWT reales en el repositorio o la imagen Docker. Si falta `jwt.secret`, el servidor no inicia.

```bash
NODE_ENV=development npm start
npm test
NODE_ENV=production PORT=8080 npm start
```

El último comando requiere una configuración privada de producción válida; no usar credenciales de producción para pruebas locales. El arranque actual sincroniza Sequelize con `alter: true`; para cambios futuros de esquema conviene utilizar migraciones controladas.

## Autenticación

La autenticación usa `bcrypt`, `jsonwebtoken` y `express-jwt`. Las contraseñas se almacenan como hash con salt; `password_hash` y `salt_key` no se incluyen en las respuestas de usuario. Los tokens se firman con HS256 y contienen el identificador del usuario en `sub`.

| Clave de configuración | Valor / uso |
|---|---|
| jwt.secret | Secreto privado de firma |
| jwt.expiresIn | 15m |
| jwt.issuer | stride-co |
| jwt.audience | stride-co-api |
| bcrypt.saltRounds | 10 (4 en test) |

### Inicio de sesión

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -H 'Accept-Language: en' \
  -d '{"email":"admin@demo.stride.example","password":"DemoAdmin2026!"}'
```

El login correcto responde 200 con `message` y `data`, que contiene `user` y `token`. Ejemplo ilustrativo (los IDs y el token dependen de la ejecución):

```json
{
  "message": "Login successful",
  "data": {
    "user": {"id": 1, "first_name": "admin", "last_name": "Demo", "email": "admin@demo.stride.example", "active": true, "role_id": 1},
    "token": "<jwt>"
  }
}
```

Si faltan las credenciales se responde 400; si son incorrectas o el usuario está inactivo se responde 401. El token se envía en el encabezado `Authorization: Bearer <token>`.

```bash
TOKEN='PEGAR_TOKEN_AQUI'
curl -i http://localhost:3000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

`GET /api/auth/me` requiere JWT, pero no un permiso RBAC específico. Devuelve directamente los datos básicos del usuario (`id`, `first_name`, `last_name`, `email`, `role_id`, `active`). Si el token no es válido, expira o el usuario deja de estar activo, responde 401.

## Control de acceso basado en roles (RBAC)

El middleware `authenticate` verifica el JWT. Después `authorize(recurso, accion, alcance)` comprueba los permisos mediante `accesscontrol`. Los permisos se cargan de PostgreSQL a partir de Role → RolePermission → Permission; no se deciden por nombre de rol en los controladores. `Permission.key` sigue la convención `recurso:accion:alcance`, con acciones create, read, update y delete y alcances own y any.

| Rol | Descripción |
|---|---|
| admin | Todos los permisos del seed; los permisos own mantienen la comprobación de pertenencia. |
| seller | Consulta catálogo, inventario, clientes y órdenes; gestiona sus propios recursos cuando corresponde. |
| user | Consulta catálogo, crea clientes y órdenes y consulta/modifica sus propios recursos. |

### Matriz RBAC

✓ = permiso concedido; — = no concedido. La matriz corresponde a `backend/seeders/rbac.js` (34 permisos distintos, 57 asignaciones).

| Permission.key | admin | seller | user |
|---|:---:|:---:|:---:|
| `products:read:any` | ✓ | ✓ | ✓ |
| `products:create:any` | ✓ | — | — |
| `products:update:any` | ✓ | — | — |
| `products:delete:any` | ✓ | — | — |
| `orders:create:any` | ✓ | ✓ | ✓ |
| `orders:read:own` | ✓ | ✓ | ✓ |
| `orders:read:any` | ✓ | ✓ | — |
| `orders:update:own` | ✓ | ✓ | ✓ |
| `orders:delete:own` | ✓ | ✓ | ✓ |
| `users:read:any` | ✓ | — | — |
| `users:create:any` | ✓ | — | — |
| `users:update:any` | ✓ | — | — |
| `users:delete:any` | ✓ | — | — |
| `customers:create:any` | ✓ | ✓ | ✓ |
| `customers:read:own` | ✓ | ✓ | ✓ |
| `customers:read:any` | ✓ | ✓ | — |
| `customers:update:own` | ✓ | ✓ | ✓ |
| `customers:delete:own` | ✓ | ✓ | ✓ |
| `roles:create:any` | ✓ | — | — |
| `roles:read:any` | ✓ | — | — |
| `roles:update:any` | ✓ | — | — |
| `roles:delete:any` | ✓ | — | — |
| `permissions:create:any` | ✓ | — | — |
| `permissions:read:any` | ✓ | — | — |
| `permissions:update:any` | ✓ | — | — |
| `permissions:delete:any` | ✓ | — | — |
| `variants:create:any` | ✓ | — | — |
| `variants:read:any` | ✓ | ✓ | ✓ |
| `variants:update:any` | ✓ | — | — |
| `variants:delete:any` | ✓ | — | — |
| `inventory:create:any` | ✓ | — | — |
| `inventory:read:any` | ✓ | ✓ | — |
| `inventory:update:any` | ✓ | — | — |
| `inventory:delete:any` | ✓ | — | — |

### Alcances own y any

- `products:delete:any`: solo admin tiene el permiso; seller y user reciben 403.
- `orders:read:own`: user solo puede consultar una orden que le pertenece. El middleware resuelve Order.customerId → Customer.userId y compara con el ID autenticado.
- `orders:read:any`: admin y seller pueden consultar cualquier orden y listar todas las órdenes.
- `customers:read:own`: el dueño se obtiene de Customer.userId. Los permisos any equivalentes permiten consultar cualquier cliente.
- Actualizar y eliminar clientes u órdenes requiere own; el seed no concede sus variantes update:any o delete:any, incluso al administrador.

```javascript
router.delete('/:id', authenticate,
  authorize('products', 'delete', 'any'), controller.destroy);
router.get('/:id', authenticate,
  authorize('orders', 'read', 'own', { ownerResolver: orderOwner }),
  ordersController.find);
```

El middleware responde 403 si el usuario no tiene permiso o no es dueño del recurso. Si el recurso no existe, el controlador devuelve 404. La autorización se inicializa desde las relaciones de la base de datos al arrancar el servidor. Tras modificar las asociaciones RBAC, reiniciar la aplicación para cargar los permisos actualizados.

## Endpoints de la API

Todas las rutas de los ocho recursos requieren JWT y el permiso indicado. Las excepciones son las rutas públicas y `/api/auth/me`. Las consultas CRUD devuelven normalmente `{"message":"...","data":...}` y los errores JSON un mensaje traducido. `/health` devuelve el estado del servicio, `/` es una vista HTML y `/api/auth/me` devuelve los datos básicos del usuario directamente.

| Método | Endpoint | Permiso | Descripción |
|---|---|---|---|
| GET | `/` | Público | Página principal. |
| GET | `/health` | Público | Disponibilidad del servicio. |
| POST | `/api/auth/login` | Público | Generar JWT. |
| GET | `/api/auth/me` | JWT | Consultar usuario autenticado. |
| GET | `/api/users` | `users:read:any` | Listar usuarios. |
| GET | `/api/users/:id` | `users:read:any` | Consultar un usuario por ID. |
| POST | `/api/users` | `users:create:any` | Crear un usuario. |
| PUT | `/api/users/:id` | `users:update:any` | Actualizar un usuario. |
| DELETE | `/api/users/:id` | `users:delete:any` | Eliminar un usuario. |
| GET | `/api/roles` | `roles:read:any` | Listar roles. |
| GET | `/api/roles/:id` | `roles:read:any` | Consultar un rol por ID. |
| POST | `/api/roles` | `roles:create:any` | Crear un rol. |
| PUT | `/api/roles/:id` | `roles:update:any` | Actualizar un rol. |
| DELETE | `/api/roles/:id` | `roles:delete:any` | Eliminar un rol. |
| GET | `/api/permissions` | `permissions:read:any` | Listar permisos. |
| GET | `/api/permissions/:id` | `permissions:read:any` | Consultar un permiso por ID. |
| POST | `/api/permissions` | `permissions:create:any` | Crear un permiso. |
| PUT | `/api/permissions/:id` | `permissions:update:any` | Actualizar un permiso. |
| DELETE | `/api/permissions/:id` | `permissions:delete:any` | Eliminar un permiso. |
| GET | `/api/products` | `products:read:any` | Listar productos. |
| GET | `/api/products/:id` | `products:read:any` | Consultar un producto por ID. |
| POST | `/api/products` | `products:create:any` | Crear un producto. |
| PUT | `/api/products/:id` | `products:update:any` | Actualizar un producto. |
| DELETE | `/api/products/:id` | `products:delete:any` | Eliminar un producto. |
| GET | `/api/variants` | `variants:read:any` | Listar variantes. |
| GET | `/api/variants/:id` | `variants:read:any` | Consultar una variante por ID. |
| POST | `/api/variants` | `variants:create:any` | Crear una variante. |
| PUT | `/api/variants/:id` | `variants:update:any` | Actualizar una variante. |
| DELETE | `/api/variants/:id` | `variants:delete:any` | Eliminar una variante. |
| GET | `/api/inventory` | `inventory:read:any` | Listar registros de inventario. |
| GET | `/api/inventory/:id` | `inventory:read:any` | Consultar un registro de inventario por ID. |
| POST | `/api/inventory` | `inventory:create:any` | Crear un registro de inventario. |
| PUT | `/api/inventory/:id` | `inventory:update:any` | Actualizar un registro de inventario. |
| DELETE | `/api/inventory/:id` | `inventory:delete:any` | Eliminar un registro de inventario. |
| GET | `/api/customers` | `customers:read:any` | Listar clientes. |
| GET | `/api/customers/:id` | `customers:read:own` / `customers:read:any` | Consultar un cliente por ID según alcance. |
| POST | `/api/customers` | `customers:create:any` | Crear un cliente. |
| PUT | `/api/customers/:id` | `customers:update:own` | Actualizar un cliente propio/a. |
| DELETE | `/api/customers/:id` | `customers:delete:own` | Eliminar un cliente propio/a. |
| GET | `/api/orders` | `orders:read:any` | Listar órdenes. |
| GET | `/api/orders/:id` | `orders:read:own` / `orders:read:any` | Consultar una orden por ID según alcance. |
| POST | `/api/orders` | `orders:create:any` | Crear una orden. |
| PUT | `/api/orders/:id` | `orders:update:own` | Actualizar una orden propio/a. |
| DELETE | `/api/orders/:id` | `orders:delete:own` | Eliminar una orden propio/a. |

### Códigos HTTP

| Código | Significado |
|---|---|
| 200 | Consulta, actualización o eliminación correcta. |
| 201 | Creación correcta. |
| 400 | Datos inválidos, identificador mal formado o valor único repetido. |
| 401 | Sin token válido o credenciales incorrectas. |
| 403 | Sin el permiso requerido o recurso de otro usuario. |
| 404 | Recurso o ruta inexistente. |
| 500 | Error inesperado del servidor. |

Los controladores utilizan el ORM/ODM correspondiente; el manejador central de errores recibe errores mediante `next(err)` y traduce las respuestas. Las relaciones permiten consultar, por ejemplo, las variantes de un producto y el cliente asociado a una orden.

## Datos de demostración

Con las conexiones configuradas, ejecutar `NODE_ENV=development npm run seed` desde `backend/`. El seed carga roles y permisos, usuarios demo, productos, variantes, inventario, clientes y órdenes. Se crean dos productos con sus variantes y registros de inventario con 20 unidades iniciales; cada usuario demo tiene un cliente y una orden propia con pago CASH, estado inicial PENDING e importes Decimal128.

| Rol | Correo | Contraseña de demostración |
|---|---|---|
| admin | admin@demo.stride.example | DemoAdmin2026! |
| seller | seller@demo.stride.example | DemoSeller2026! |
| user | user@demo.stride.example | DemoUser2026! |

Estas credenciales son ficticias, públicas y exclusivas de las cuentas de demostración. No reutilizarlas en otros sistemas. El servicio público está destinado a la evaluación académica, no a procesar datos reales de clientes.

El seed puede repetirse secuencialmente sin duplicar los datos ni restablecer contraseñas, inventario o historial existentes. Las asociaciones RBAC se actualizan conforme a la matriz. Si una cuenta demo existe con otro rol o está inactiva, se reporta el conflicto. No hay una transacción conjunta entre las dos bases; ante un fallo, corregir la causa y repetir el seed. El comando `node seeders/rbac.js` permite cargar únicamente roles y permisos sobre tablas existentes.

La ejecución local del 15 de noviembre de 2026 confirmó 10 permisos para user, 13 para seller y 34 para admin (57 asignaciones en total). Reiniciar la API tras cargar permisos.

## Internacionalización (i18n)

Se utiliza la librería `i18n`. Los archivos son `backend/locales/es.json` y `backend/locales/en.json`, con configuración en `backend/config/i18n.js`. El idioma predeterminado es inglés.

El orden de selección es: `?lang=es` o `?lang=en`, encabezado `Accept-Language` y, por último, idioma predeterminado. Las variantes regionales como es-MX se resuelven a es; un idioma no soportado como fr utiliza en. La cookie lang no se utiliza.

```bash
curl -i 'http://localhost:3000/api/customers?lang=es'
curl -i http://localhost:3000/api/customers -H 'Accept-Language: es-MX'
```

Sin token, estas peticiones devuelven 401 con `{"message":"No autorizado"}`. Los controladores usan claves mediante `req.__('orders.notFound')`; el manejador central traduce errores, incluidos 401, 403 y 404. Las vistas Pug también utilizan las traducciones.

Para agregar un idioma, copiar `en.json` a `locales/<codigo>.json`, traducir los valores sin cambiar las claves, registrar el idioma en `config/i18n.js`, incorporar el archivo a las pruebas de igualdad de claves y ejecutar `npm test` y `npm run lint`. La opción `updateFiles: false` evita que la librería modifique los JSON.

## Pruebas y calidad de código

### Análisis estático y pruebas con mocks

```bash
npm run lint
npm test
```

`npm test` ejecuta las pruebas unitarias y con mocks sin requerir PostgreSQL ni MongoDB en ejecución y excluye `test/e2e/`. Las 13 suites incluyen ocho archivos `*.mock.test.js` (users, roles, permissions, products, variants, inventory, customers, orders), más `rbac.middleware.test.js`, `order.model.test.js`, `seed.test.js`, `i18n.test.js` y `errorHandler.test.js`.

### Pruebas E2E

Las E2E usan Jest y Supertest contra una API en ejecución, sin importar `app.js` ni utilizar mocks. Se ubican en `backend/test/e2e/`; `helpers.js` lee `e2e.baseUrl` mediante config y obtiene tokens de los usuarios demo. Las suites crean datos propios y realizan limpieza al finalizar sin eliminar bases completas ni modificar los datos iniciales del seed.

| Suite | Cobertura |
|---|---|
| health.e2e.test.js | Health check. |
| auth.e2e.test.js | Login válido/inválido, JWT y /me. |
| rbac.e2e.test.js | Permisos, acceso own/any y denegaciones. |
| i18n.e2e.test.js | Traducciones y selección de idioma. |
| users.e2e.test.js | CRUD de usuarios, errores y permisos. |
| roles.e2e.test.js | CRUD de roles, errores y permisos. |
| permissions.e2e.test.js | CRUD de permisos, errores y permisos. |
| products.e2e.test.js | CRUD de productos, errores y permisos. |
| variants.e2e.test.js | CRUD de variantes, errores y permisos. |
| inventory.e2e.test.js | CRUD de registros de inventario, errores y permisos. |
| customers.e2e.test.js | CRUD de clientes, errores y permisos. |
| orders.e2e.test.js | CRUD de órdenes, errores y permisos. |

**Ejecución local.** Encender las bases de datos, ejecutar el seed e iniciar la API según la guía de instalación. En otra terminal, desde backend/:

```bash
curl -i http://localhost:3000/health
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

También se puede ejecutar `npm run test:e2e` sin indicar URL, ya que el valor predeterminado es `http://localhost:3000`.

**Ejecución contra Render.** Consultar primero /health para despertar el servicio si estaba inactivo. Ejecutar únicamente contra el entorno demo autorizado:

```bash
curl -i --max-time 120 https://stride-and-co-o8i1.onrender.com/health
E2E_BASE_URL=https://stride-and-co-o8i1.onrender.com npm run test:e2e
```

### Google Antigravity

Las E2E fueron generadas con Google Antigravity desde la terminal utilizando una cuenta institucional UACH y revisadas por el equipo. Los prompts, correcciones, capturas y evidencias de limpieza se documentan en [docs/e2e-antigravity.md](docs/e2e-antigravity.md). Los commits identifican las suites generadas y revisadas.

### Resultados finales verificados

Fecha: **15 de noviembre de 2026**. Versión local revisada: `edbb753` de staging.

| Comando / entorno | Suites | Pruebas | Resultado |
|---|---:|---:|---|
| npm run lint | — | — | Sin errores |
| npm test | 13/13 | 319/319 | Aprobado |
| npm run test:e2e (local) | 12/12 | 112/112 | Aprobado, 6.823 s |
| npm run test:e2e (Render) | 12/12 | 112/112 | Aprobado, 135.359 s |

La ejecución contra Render fue repetida con éxito. La siguiente captura corresponde a la corrida de 135.359 segundos:

![Resultado de las pruebas E2E contra Render](docs/img/e2e-render.png)

## API pública y despliegue

| Dato | Información |
|---|---|
| URL pública | https://stride-and-co-o8i1.onrender.com/ |
| Rama de entrega | staging |
| Health Check | GET /health — HTTP 200 |
| Fecha de verificación | 15 de noviembre de 2026 |
| E2E contra Render | 12 suites, 112 pruebas aprobadas |

### Infraestructura

El despliegue previsto usa Render Web Service (Docker), Render PostgreSQL y MongoDB Atlas, con los planes gratuitos exigidos en el entregable. La URL y las pruebas confirman que el servicio público funciona. Los datos de los paneles de infraestructura que todavía deben verificarse están señalados a continuación.

| Servicio | Datos |
|---|---|
| Render Web Service | API Node.js/Express con Docker; plan gratuito y rama/commit desplegados: confirmar en el panel. |
| Render PostgreSQL | Plan: confirmar gratuito; fecha de creación: **PENDIENTE DE CONFIRMAR**; región: **PENDIENTE DE CONFIRMAR**. |
| MongoDB Atlas | Plan: confirmar gratuito; proveedor: **PENDIENTE DE CONFIRMAR**; región: **PENDIENTE DE CONFIRMAR**; Network Access: **PENDIENTE DE CONFIRMAR**. |

Render PostgreSQL debe permanecer activo durante la evaluación. El plan gratuito tiene vigencia limitada: revisar la fecha de expiración. En Atlas se requiere un usuario de base de datos exclusivo y acceso de red para Render; confirmar la regla real configurada sin publicar credenciales.

### Despliegue y secretos

El Dockerfile de la raíz utiliza `node:22-alpine`, `NODE_ENV=production`, `npm ci --omit=dev` y el script `docker-entrypoint.sh`. En Render, configurar el servicio Docker desde staging, puerto asignado por `PORT` y Health Check Path `/health`.

La configuración privada se prepara a partir de `backend/config/local-production.example.json`. El mecanismo del proyecto utiliza Render Secret Files: cargar `local-production.json` en el servicio. Al arrancar, el entrypoint copia `/etc/secrets/local-*.json` a `/app/config/` y ejecuta `npm start`. El archivo contiene las conexiones de PostgreSQL y MongoDB y `jwt.secret`; no se incorpora a Git ni a la imagen. Usar el host interno de Render PostgreSQL para el servicio; la conexión externa, si se utiliza, requiere configurar SSL en Sequelize (no está implementado en la configuración revisada). Las E2E contra la API pública no requieren conexión externa directa a PostgreSQL.

Después de desplegar, ejecutar el seed con las conexiones de producción desde un entorno autorizado y reiniciar el servicio para cargar RBAC. Los usuarios demo de la API pública funcionan, como confirma la suite E2E de autenticación. El procedimiento administrativo exacto de carga del seed y la configuración efectiva del panel deben confirmarse con el responsable de despliegue.

### Ejemplo de uso público

Las cuentas demo son las de la sección [Datos de demostración](#datos-de-demostración). Comprobar disponibilidad e iniciar sesión con el rol user:

```bash
BASE_URL='https://stride-and-co-o8i1.onrender.com'
curl -i --max-time 120 "$BASE_URL/health"
curl -i -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -H 'Accept-Language: es' \
  -d '{"email":"user@demo.stride.example","password":"DemoUser2026!"}'
```

Copiar el token de `data.token` en la terminal:

```bash
TOKEN='PEGAR_TOKEN_AQUI'
# Recurso permitido: 200
curl -i "$BASE_URL/api/products" \
  -H "Authorization: Bearer $TOKEN" -H 'Accept-Language: es'
# Recurso denegado: 403 en español y en inglés
curl -i "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $TOKEN" -H 'Accept-Language: es'
curl -i "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $TOKEN" -H 'Accept-Language: en'
```

El rol user puede consultar el catálogo, pero no listar todas las órdenes. Las respuestas denegadas contienen `{"message":"Acceso denegado"}` y `{"message":"Forbidden"}`, respectivamente. La evidencia de las E2E se incluye en la sección [Pruebas y calidad de código](#pruebas-y-calidad-de-código).

## Organización del repositorio y trabajo colaborativo

El equipo integra los bloques mediante ramas y Pull Requests hacia staging, conservando las ramas remotas y utilizando commits descriptivos con Conventional Commits. Las ramas pueden tener nombres distintos a los sugeridos por el entregable.

| Rama | Bloque |
|---|---|
| main | Rama principal y base inicial. |
| staging | Integración y entrega. |
| refactor/models-folders | Modelos SQL/Mongo, PostgreSQL y seed. |
| feat/orm-odm-routes | Rutas CRUD y persistencia. |
| feat/jwt-authentication | Autenticación JWT. |
| feat/rbac-authorization | Autorización y permisos. |
| feat/config | Configuración por entornos. |
| chore/render-deploy | Docker y despliegue. |
| test/api-mocks | Pruebas con mocks. |
| test/e2e | Pruebas E2E con Antigravity. |

El PR [#27](https://github.com/Donnie502/stride-and-co/pull/27) integró pruebas con mocks y la corrección del POST de órdenes. El commit `92399aa` incorporó test/e2e y `2a77b18` incorporó feat/orm-odm-routes a staging. Las ramas de configuración y despliegue también están integradas.

El seguimiento del trabajo se realiza en GitHub Project. Antes de entregar, verificar que las tareas, responsables y evidencias estén actualizados.
