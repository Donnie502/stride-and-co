# Stride & Co. - Sistema de Gestión y Ventas

## Descripción del Proyecto
Este proyecto busca digitalizar el flujo completo de venta para Stride & Co., permitiendo la publicación de catálogo, compra, actualización de estado y notificación al cliente. El objetivo es brindar visibilidad en tiempo real del inventario, descontar el stock automáticamente al confirmarse un pedido para evitar sobreventas y centralizar el registro formal de cada pedido.

## Integrantes del Equipo (Scrum)
* **Ezequiel Adolfo Herrera Hernandez** (385717) - Product Owner
* **Carlos Alberto Díaz Sánchez** (385539) - Scrum Master
* **Edgar Alejandro Gutierrez Carrillo** (385655) - Developer
* **Diego Ivan Ibarra Lozoya** (373781) - Developer

## Preparación local con contenedores propios

Necesitas Git, Node.js 22 con npm y Docker en ejecución. Los contenedores contienen
las bases de datos; la API se ejecuta en tu computadora. No necesitas los contenedores
ni las credenciales personales de otro integrante.

### 1. Descargar e instalar

```bash
git clone https://github.com/Donnie502/stride-and-co
cd stride-and-co
```

Para revisar el entregable integrado, cambia a `staging` antes de instalar:

```bash
git switch staging
cd backend
npm ci
```

Los pasos siguientes se ejecutan desde `backend/`. Para probar trabajo aún no
integrado, utiliza la rama que contenga esos cambios.

### 2. Crear PostgreSQL y MongoDB

Los siguientes valores son ejemplos públicos para desarrollo local. Puedes usar
otros, siempre que actualices también las conexiones. No reutilices contraseñas reales.

```bash
docker volume create stride-postgres-data
docker volume create stride-mongo-data

docker run -d \
  --name stride-postgres \
  -e POSTGRES_DB=stride_co \
  -e POSTGRES_USER=stride \
  -e POSTGRES_PASSWORD='StrideLocal2026!' \
  -p 127.0.0.1:5432:5432 \
  -v stride-postgres-data:/var/lib/postgresql/data \
  postgres:16

docker run -d \
  --name stride-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=stride_demo \
  -e MONGO_INITDB_ROOT_PASSWORD='MongoLocal2026!' \
  -p 127.0.0.1:27027:27017 \
  -v stride-mongo-data:/data/db \
  mongo:7.0
```

MongoDB se publica en `27027` para permitir que otro MongoDB siga usando `27017`.
Si el nombre del contenedor o un puerto ya están ocupados, reutiliza tu instancia
con sus credenciales o elige otro nombre y puerto. No ejecutes de nuevo `docker run`
si ya creaste estos contenedores; en sesiones posteriores usa:

```bash
docker start stride-postgres stride-mongo
```

Comprueba que ambos acepten conexiones:

```bash
docker exec stride-postgres pg_isready -U stride -d stride_co
docker exec stride-mongo mongosh --quiet \
  --username stride_demo --password 'MongoLocal2026!' \
  --authenticationDatabase admin \
  --eval 'db.adminCommand({ ping: 1 })'
```

Espera `accepting connections` para PostgreSQL y `ok: 1` para MongoDB. Si todavía
están iniciando, consulta `docker logs stride-postgres` o `docker logs stride-mongo`
y repite la comprobación. Las variables iniciales de Docker solo crean usuarios al
inicializar un volumen vacío; no cambian las contraseñas de un volumen existente.

### 3. Configurar PostgreSQL

```bash
cp config/local-development.example.json config/local-development.json
```

Si el archivo local ya existe, edítalo sin sobrescribir tus otras opciones. Ajusta
su bloque `postgres` para que coincida con tu contenedor:

```json
{
  "postgres": {
    "host": "localhost",
    "port": 5432,
    "database": "stride_co",
    "user": "stride",
    "password": "StrideLocal2026!"
  }
}
```

Sequelize obtiene estos valores mediante `config`, que combina `default.json` con
`local-development.json` para el entorno `development`. El archivo local está
excluido de Git; la plantilla de ejemplo sí se comparte. PostgreSQL debe tener
creada la base `stride_co`: `POSTGRES_DB` la crea al inicializar el contenedor.

### 4. Configurar MongoDB y JWT en la terminal

La migración de configuración aún es parcial: el conector MongoDB y JWT leen
variables de entorno. Los bloques `mongo.uri` y `jwt.secret` de la plantilla local
todavía no son consumidos por esos módulos. Ejecuta en la misma terminal:

```bash
export NODE_ENV=development
export PORT=3000
export MONGO_URI='mongodb://stride_demo:MongoLocal2026!@localhost:27027/stride_co?authSource=admin'
export JWT_SECRET="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
```

`authSource=admin` indica dónde se creó el usuario raíz de MongoDB. Si usas otra
instancia, cambia usuario, contraseña, host y puerto; codifica los caracteres
especiales de las credenciales para usarlos en una URI. Conserva estas variables
al ejecutar el seed y la API. Cada terminal nueva necesita su configuración.
El seed no carga `.env` automáticamente.

### 5. Cargar datos e iniciar la API

```bash
npm run seed
npm run dev
```

El seed crea las tablas faltantes y los datos de demostración. Debe finalizar con
`Seed completo: roles, permisos y datos de demostración disponibles.` antes de
iniciar la API. Consulta las cuentas en [Datos de demostración](#datos-de-demostración).

`npm run dev` selecciona `development` y recarga el servidor con supervisor.
`npm start` selecciona `production`: no usa `local-development.json` y requiere
su propia configuración de producción. El arranque actual ejecuta
`sequelize.sync({ alter: true })`; esta guía está destinada a bases locales de desarrollo.

### 6. Comprobar la API

Desde otra terminal, mientras el servidor está activo:

```bash
curl -i http://localhost:3000/health

curl -i http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.stride.example","password":"DemoAdmin2026!"}'
```

La primera petición debe responder `200` con `{"status":"UP"}`. El login debe
responder `200` con un JWT en `data.token`. Copia ese token en tu terminal:

```bash
TOKEN='PEGA_AQUI_EL_TOKEN'
curl -i http://localhost:3000/api/auth/me -H "Authorization: Bearer $TOKEN"
curl -i http://localhost:3000/api/products -H "Authorization: Bearer $TOKEN"
```

Para comprobar una denegación sin modificar datos, inicia sesión con
`user@demo.stride.example` y `DemoUser2026!`, asigna su token a `TOKEN` y ejecuta:

```bash
curl -i http://localhost:3000/api/orders -H "Authorization: Bearer $TOKEN"
```

Debe responder `403`: ese rol puede consultar órdenes propias por ID, pero no
listar todas. Una petición protegida sin token debe responder `401`.

### Problemas frecuentes

| Mensaje | Qué revisar |
|---|---|
| `ECONNREFUSED` | Contenedor iniciado, puerto publicado y host configurado. |
| `Authentication failed` en MongoDB | Usuario, contraseña y `authSource`; usa las credenciales del volumen existente. |
| `Command find requires authentication` | La URI MongoDB no incluye las credenciales requeridas. |
| Error de contraseña de PostgreSQL | El bloque `postgres` debe coincidir con la instancia existente. |
| `Falta JWT_SECRET` | Exporta la variable antes de iniciar la API. |
| `Configuration property "mysql" is not defined` al probar | El helper de integración sigue pendiente de migrar a PostgreSQL. |

## Pruebas y calidad de código

Desde `backend/`, ejecuta el análisis estático:

```bash
npm run lint
```

Las siguientes suites funcionan sin PostgreSQL ni MongoDB. Validan el modelo de
órdenes, el poblado con mocks y el middleware RBAC:

```bash
npm test -- --runTestsByPath test/order.model.test.js test/seed.test.js test/rbac.middleware.test.js
```

La suite del seed comprueba que repetir la carga no duplique datos y conserva las
modificaciones de inventario e historial. No reemplaza una prueba contra bases reales.

`npm test` ejecuta todas las suites, incluidas las de integración. Actualmente el
helper `test/helpers/db.js` todavía usa `mysql2/promise` y `config.get('mysql')`,
aunque la aplicación ya usa PostgreSQL. Por eso la suite completa no está lista
para ejecutarse correctamente con los contenedores de esta guía. También está
pendiente integrar el manejo HTTP de errores de validación. No configures MySQL
para eludir estos pendientes: se debe migrar el helper de pruebas.

La separación completa de pruebas con mocks y E2E y el script `npm run test:e2e`
siguen pendientes. Las pruebas de integración realizan operaciones destructivas
en bases con sufijo `_test`; no deben apuntar a `stride_co` ni a producción.

## Autenticación
La API autentica a los usuarios mediante **JSON Web Tokens (JWT)** y almacena las contraseñas de forma segura con **bcrypt**.

### Protección de contraseñas
* Las contraseñas **nunca** se guardan en texto plano; se protegen con **bcrypt**.
* El factor de costo (*salt rounds*) se configura con la variable de entorno `BCRYPT_SALT_ROUNDS` (valor por defecto: `10`).
* En el modelo `User` se guardan dos campos:
  * `salt_key`: el salt generado con `bcrypt.genSalt()`.
  * `password_hash`: el hash generado con `bcrypt.hash()`.
* Al crear un usuario o cambiar su contraseña se genera un **nuevo** salt y un **nuevo** hash.
* La verificación se hace con `bcrypt.compare()`.
* Las respuestas de la API nunca incluyen `password`, `password_hash` ni `salt_key`.

### Librerías utilizadas
| Librería | Uso |
|---|---|
| `bcrypt` | Generar y verificar el hash de las contraseñas |
| `jsonwebtoken` | Firmar (emitir) el JWT en el login |
| `express-jwt` | Verificar el JWT en las rutas protegidas |

### Variables de entorno
El código actual lee estas variables de entorno. La guía de preparación anterior
exporta `JWT_SECRET`; las demás son opcionales y tienen los valores por defecto
indicados. El arranque también carga `.env` mediante `dotenv`, pero el seed no lo
hace. La migración completa a `config` está pendiente; no publiques secretos reales.

```env
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_ISSUER=stride-co
JWT_AUDIENCE=stride-co-api
BCRYPT_SALT_ROUNDS=10
```

| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Clave secreta para firmar los tokens (debe generarla cada quien) |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token |
| `JWT_ISSUER` | Emisor del token |
| `JWT_AUDIENCE` | Audiencia del token |
| `BCRYPT_SALT_ROUNDS` | Factor de costo de bcrypt |

### Tiempo de expiración
Los tokens expiran a los **15 minutos** (`JWT_EXPIRES_IN=15m`). Pasado ese tiempo es necesario iniciar sesión de nuevo.

### Endpoint de login
`POST /api/auth/login`

Body:
```json
{
  "email": "admin@demo.stride.example",
  "password": "DemoAdmin2026!"
}
```

Ejemplo con curl:
```bash
curl -X POST localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.stride.example","password":"DemoAdmin2026!"}'
```

Si las credenciales son correctas, la API responde `200` con los datos básicos del usuario (sin `password_hash` ni `salt_key`) y un JWT firmado cuyo payload incluye `sub` (el id del usuario) y los claims de emisión, expiración,
emisor y audiencia. Ejemplo ilustrativo; los identificadores dependen de la base:
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "first_name": "admin",
      "last_name": "Demo",
      "email": "admin@demo.stride.example",
      "active": true,
      "role_id": 1
    },
    "token": "<jwt>"
  }
}
```

Si faltan datos (`email` o `password`), responde `400`:
```json
{
  "message": "Email and password are required"
}
```

Si las credenciales son incorrectas o el usuario está inactivo, responde `401` con un mensaje genérico:
```json
{
  "message": "Invalid credentials"
}
```

### Endpoint del usuario autenticado
`GET /api/auth/me` (ruta protegida con el middleware `authenticate`)

El token se envía en el header `Authorization`:
```
Authorization: Bearer <token>
```

Ejemplo con curl:
```bash
curl localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

Si el token no existe, es inválido o ya expiró (o el usuario ya no existe o está inactivo), la API responde `401` en JSON:
```json
{
  "message": "Unauthorized"
}
```

Respuesta con token válido (`200`):
```json
{
  "id": 1,
  "first_name": "admin",
  "last_name": "Demo",
  "email": "admin@demo.stride.example",
  "role_id": 1,
  "active": true
}
```

### Códigos de estado HTTP
| Situación | Código |
|---|---|
| Login correcto | 200 |
| Datos de login incompletos | 400 |
| Credenciales incorrectas | 401 |
| Usuario inactivo | 401 |
| Token inexistente | 401 |
| Token inválido o expirado | 401 |
| `/api/auth/me` con token válido | 200 |

## Control de acceso basado en roles

La autorización de la API se resuelve con RBAC (control de acceso basado en roles), separada de la autenticación (JWT). El middleware `authorize(recurso, accion, alcance)` decide si el usuario autenticado puede ejecutar la operación; si no tiene el permiso, la API responde `403 Forbidden`.

### Roles

| Rol | Descripción |
|---|---|
| `admin` | Todos los permisos de la matriz; las acciones `own` siguen comprobando pertenencia |
| `seller` | Gestiona ventas, consulta todas las órdenes, los clientes y el inventario |
| `user` | Compra productos y consulta sus propias órdenes |

### Convención de `Permission.key`

Cada permiso se identifica con `recurso:acción:alcance`:

```
orders:read:own
  |     |    |
  |     |    +-- alcance: own (solo recursos del usuario) o any (cualquiera)
  |     +------- acción: create, read, update, delete
  +------------- recurso: products, orders, users, customers, roles, permissions, variants, inventory
```

### Matriz RBAC

| Permission.key | admin | seller | user |
|---|:-:|:-:|:-:|
| `products:read:any` | ✓ | ✓ | ✓ |
| `products:create:any` | ✓ | × | × |
| `products:update:any` | ✓ | × | × |
| `products:delete:any` | ✓ | × | × |
| `orders:create:any` | ✓ | ✓ | ✓ |
| `orders:read:own` | ✓ | ✓ | ✓ |
| `orders:read:any` | ✓ | ✓ | × |
| `orders:update:own` | ✓ | ✓ | ✓ |
| `orders:delete:own` | ✓ | ✓ | ✓ |
| `users:read:any` | ✓ | × | × |
| `users:create:any` | ✓ | × | × |
| `users:update:any` | ✓ | × | × |
| `users:delete:any` | ✓ | × | × |
| `customers:create:any` | ✓ | ✓ | ✓ |
| `customers:read:own` | ✓ | ✓ | ✓ |
| `customers:read:any` | ✓ | ✓ | × |
| `customers:update:own` | ✓ | ✓ | ✓ |
| `customers:delete:own` | ✓ | ✓ | ✓ |
| `roles:create:any` | ✓ | × | × |
| `roles:read:any` | ✓ | × | × |
| `roles:update:any` | ✓ | × | × |
| `roles:delete:any` | ✓ | × | × |
| `permissions:create:any` | ✓ | × | × |
| `permissions:read:any` | ✓ | × | × |
| `permissions:update:any` | ✓ | × | × |
| `permissions:delete:any` | ✓ | × | × |
| `variants:create:any` | ✓ | × | × |
| `variants:read:any` | ✓ | ✓ | ✓ |
| `variants:update:any` | ✓ | × | × |
| `variants:delete:any` | ✓ | × | × |
| `inventory:create:any` | ✓ | × | × |
| `inventory:read:any` | ✓ | ✓ | × |
| `inventory:update:any` | ✓ | × | × |
| `inventory:delete:any` | ✓ | × | × |

### Endpoints protegidos

Todas las rutas de la tabla piden token (`authenticate`) y después el permiso (`authorize`). Las rutas públicas son `GET /`, `POST /api/auth/login` y `GET /health`. `GET /api/auth/me` solo pide token.

| Endpoint | Permiso requerido |
|---|---|
| `GET /api/products` | `products:read:any` |
| `GET /api/products/:id` | `products:read:any` |
| `POST /api/products` | `products:create:any` |
| `PUT /api/products/:id` | `products:update:any` |
| `DELETE /api/products/:id` | `products:delete:any` |
| `GET /api/orders` | `orders:read:any` |
| `GET /api/orders/:id` | `orders:read:own` / `orders:read:any` |
| `POST /api/orders` | `orders:create:any` |
| `PUT /api/orders/:id` | `orders:update:own` |
| `DELETE /api/orders/:id` | `orders:delete:own` |
| `GET /api/customers` | `customers:read:any` |
| `GET /api/customers/:id` | `customers:read:own` / `customers:read:any` |
| `POST /api/customers` | `customers:create:any` |
| `PUT /api/customers/:id` | `customers:update:own` |
| `DELETE /api/customers/:id` | `customers:delete:own` |
| `GET /api/users` | `users:read:any` |
| `GET /api/users/:id` | `users:read:any` |
| `POST /api/users` | `users:create:any` |
| `PUT /api/users/:id` | `users:update:any` |
| `DELETE /api/users/:id` | `users:delete:any` |
| `GET /api/roles` y `GET /api/roles/:id` | `roles:read:any` |
| `POST /api/roles` | `roles:create:any` |
| `PUT /api/roles/:id` | `roles:update:any` |
| `DELETE /api/roles/:id` | `roles:delete:any` |
| `GET /api/permissions` y `GET /api/permissions/:id` | `permissions:read:any` |
| `POST /api/permissions` | `permissions:create:any` |
| `PUT /api/permissions/:id` | `permissions:update:any` |
| `DELETE /api/permissions/:id` | `permissions:delete:any` |
| `GET /api/variants` y `GET /api/variants/:id` | `variants:read:any` |
| `POST /api/variants` | `variants:create:any` |
| `PUT /api/variants/:id` | `variants:update:any` |
| `DELETE /api/variants/:id` | `variants:delete:any` |
| `GET /api/inventory` y `GET /api/inventory/:id` | `inventory:read:any` |
| `POST /api/inventory` | `inventory:create:any` |
| `PUT /api/inventory/:id` | `inventory:update:any` |
| `DELETE /api/inventory/:id` | `inventory:delete:any` |

### Cómo se usa el middleware

En cada router se pone `authenticate` y luego `authorize` en cada ruta:

```js
router.use(authenticate);

router.delete('/:id', authorize('products', 'delete', 'any'), controller.destroy);
router.get('/:id', authorize('orders', 'read', 'own', { ownerResolver: orderOwner }), ordersController.find);
```

`authorize` busca el rol del usuario (`req.user.role_id`) en los permisos que se cargaron de la base de datos:

1. Si el rol tiene el permiso `any`, deja pasar.
2. Si la ruta es `own` y el rol tiene el permiso `own`, usa el `ownerResolver` para saber quién es el dueño del recurso y lo compara con `req.user.id`. Si no es el mismo usuario responde `403`.
3. Si no tiene ninguno de los dos, responde `403`.

Los `ownerResolver` están en `middlewares/ownerResolvers.js`:

| Función | Cómo busca al dueño |
|---|---|
| `orderOwner` | `Order` → `Order.customerId` → `Customer.userId` |
| `customerOwner` | `Customer.userId` |

Si el recurso no existe, el middleware deja pasar y el controller responde `404`.

Los controllers no revisan roles ni dueños. Toda la autorización pasa por `authorize` y por los permisos de la base de datos; en el código no hay validaciones del tipo `if (user.role === 'admin')`.

### Ejemplo de permiso `own`

`orders:read:own`: un `user` solo puede consultar órdenes que le pertenecen. El middleware compara el dueño de la orden (`Order.customerId` → `Customer.userId`) con el id del usuario autenticado. Si no coinciden, responde `403`. Un `seller` o un `admin` tienen `orders:read:any`, así que pueden ver cualquier orden.

### Ejemplo de permiso `any`

`products:delete:any`: solo `admin` puede eliminar cualquier producto. Un `seller` o un `user` que lo intente recibe `403`.

### Respuestas

| Situación | Código | Respuesta |
|---|---|---|
| Sin token o token inválido | 401 | `{ "message": "Unauthorized" }` |
| Con token pero sin el permiso | 403 | `{ "message": "Forbidden" }` |
| Permiso `own` sobre un recurso de otro usuario | 403 | `{ "message": "Forbidden" }` |
| Con permiso | La respuesta normal del endpoint | |

### Cómo se cargan los permisos desde la base de datos

Los permisos no están escritos en el código. Las tablas `roles`, `permissions` y `role_permissions` son la fuente de verdad. Se llenan con el seeder, que se puede correr varias veces sin duplicar datos.

1. Configura las conexiones y ejecuta `npm run seed` desde `backend/`.
2. Inicia la API con `npm run dev`, o reiníciala si ya estaba activa.

Para cargar exclusivamente RBAC sobre tablas ya creadas puedes ejecutar
`node seeders/rbac.js`. El comando completo `npm run seed` también crea datos demo.

Al iniciar, la aplicación consulta la base de datos (JOIN de roles y permisos), separa cada `Permission.key` en recurso, acción y alcance, y le inyecta esa configuración a la librería `accesscontrol`, que usa el middleware `authorize`. Los permisos solo se leen al arrancar, así que si cambias `role_permissions` hay que reiniciar la app.

### Pruebas de RBAC

`test/rbac.middleware.test.js` usa mocks y puede ejecutarse sin bases de datos con
el comando de la sección [Pruebas y calidad de código](#pruebas-y-calidad-de-código).
`test/rbac.test.js` usa bases reales y depende del helper de integración pendiente
de migración. Los escenarios que comprueba son:

| Prueba | Resultado esperado |
|---|---|
| `admin` con `products:delete:any` borra un producto | 200 |
| `seller` sin `products:delete:any` borra un producto | 403 |
| `user` con `orders:read:own` ve su propia orden | 200 |
| `user` con `orders:read:own` ve la orden de otro usuario | 403 |
| `user` sin `orders:read:any` lista todas las órdenes | 403 |

## Datos de demostración

Después de preparar las conexiones según la guía anterior, ejecuta desde `backend/`
y en la terminal donde exportaste `MONGO_URI`:

```bash
npm run seed
```

El comando crea las tablas faltantes sin alterar las existentes y carga, en orden:
roles y permisos, relaciones RBAC, usuarios, productos, variantes, inventario,
clientes y órdenes. No sustituye las migraciones de bases ya existentes.

| Rol | Correo | Contraseña de demostración |
|---|---|---|
| admin | admin@demo.stride.example | DemoAdmin2026! |
| seller | seller@demo.stride.example | DemoSeller2026! |
| user | user@demo.stride.example | DemoUser2026! |

Estas contraseñas son públicas y exclusivas de las cuentas de demostración.
Se almacenan con bcrypt, con hash y salt propios para cada usuario.

Se crean dos productos, dos variantes y sus registros de inventario con 20 unidades
iniciales. Cada usuario tiene un cliente y una orden propia, con pago `CASH`, estado
inicial `PENDING` e importes `Decimal128`. Las referencias a usuarios, productos y clientes usan los identificadores
generados por las bases de datos; las órdenes demo tienen IDs reservados.

Puedes repetir el comando de forma secuencial: reutiliza los registros existentes,
sin restablecer contraseñas, inventario ni historial de órdenes. Las órdenes demo
usan identificadores MongoDB reservados en `seeders/index.js`. Si una cuenta demo
existente está inactiva o tiene otro rol, el comando informa del conflicto sin
cambiarla. El seed RBAC vuelve a establecer las asociaciones de permisos según
la matriz declarada, como hacía anteriormente.

Si falla un paso, los anteriores pueden haber quedado guardados; corrige la causa
y vuelve a ejecutar el comando. No hay una transacción conjunta entre PostgreSQL
y MongoDB. Reinicia la API después de cargar permisos para actualizar su caché RBAC.

El comando anterior `node seeders/rbac.js` sigue disponible para cargar únicamente
roles, permisos y sus asociaciones.

Para comprobar el modelo de órdenes y la repetición del seed con mocks, sin bases
de datos:

```bash
npm test -- --runTestsByPath test/seed.test.js test/order.model.test.js
```

## Internacionalización

La API traduce sus mensajes con la librería `i18n`. La configuración está en
`backend/config/i18n.js` y los textos en `backend/locales/`.

### Idiomas

| Código | Idioma | Archivo |
|---|---|---|
| `en` | Inglés (idioma por defecto) | `locales/en.json` |
| `es` | Español | `locales/es.json` |

Hoy se traducen los mensajes de error del manejador central, los `401` y `403` de
`authenticate` y `authorize`, las respuestas de clientes y órdenes y las vistas Pug.
Los mensajes de los demás controllers todavía no se traducen.

### Cómo elegir el idioma

El idioma se decide en este orden:

1. Parámetro `?lang=` en la URL, por ejemplo `?lang=es`.
2. Encabezado `Accept-Language`, por ejemplo `Accept-Language: es-MX`.
3. Idioma por defecto: `en`.

```bash
curl -i 'http://localhost:3000/api/customers?lang=es'
curl -i http://localhost:3000/api/customers -H 'Accept-Language: es'
```

Ambas peticiones responden `401` con `{"message":"No autorizado"}`.

Un idioma no soportado, como `fr`, responde en `en`. Una variante regional del
español se resuelve a `es`, tanto en `Accept-Language: es-MX` como en `?lang=es-MX`
(opción `fallbacks` de `config/i18n.js`). La cookie `lang` ya no se usa.

### Archivos de traducción

Los dos archivos tienen exactamente las mismas claves, agrupadas por recurso
(`common`, `auth`, `customers`, `orders`, `views`). En el código se usan con
`req.__('orders.notFound')` y en las vistas con `__('views.error.title')`.
La librería está configurada con `updateFiles: false`: no escribe claves nuevas en
los JSON, así que cada clave se agrega a mano en todos los archivos a la vez.
`test/i18n.test.js` falla si `es.json` y `en.json` no tienen las mismas claves.

### Cómo agregar un idioma

1. Copia `backend/locales/en.json` a `backend/locales/<código>.json` (por ejemplo `pt.json`)
   y traduce los valores sin cambiar las claves.
2. Agrega el código a `locales` en `backend/config/i18n.js`.
3. Agrega el archivo nuevo a la comparación de claves de `backend/test/i18n.test.js`.
4. Ejecuta `npm run lint` y `npm test` desde `backend/`.

## API pública e integración del entregable

La URL pública y los datos definitivos del despliegue todavía deben documentarse
cuando el equipo integre y verifique la rama `staging`. Esta guía permite probar
la API localmente; no acredita un despliegue público validado.

| Dato de entrega | Estado |
|---|---|
| URL base de la API pública | Pendiente de confirmar por el equipo de despliegue |
| Rama de entrega | `staging`; falta verificar que integre los cambios documentados |
| Health check | `GET /health`, respuesta esperada `200` y `{"status":"UP"}` |
| Cuentas demo | Documentadas arriba; ejecutar el seed contra las bases del despliegue |
| Pruebas E2E contra URL pública | Pendientes de implementar e integrar |

Para cerrar la documentación final deben añadirse la URL real, la fecha de
verificación y los resultados del flujo health → login → recurso permitido →
recurso denegado. También faltan la internacionalización completa, la configuración
unificada con `config`, la protección de campos restringidos y la integración del
manejo de errores HTTP 400. Los endpoints de variantes todavía devuelven datos
simulados. El Dockerfile existe, pero la exclusión de archivos locales con secretos
en `.dockerignore` debe completarse antes de construir la imagen de entrega.
