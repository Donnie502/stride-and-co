# Stride & Co. - Sistema de Gestión y Ventas

## Descripción del Proyecto
Este proyecto busca digitalizar el flujo completo de venta para Stride & Co., permitiendo la publicación de catálogo, compra, actualización de estado y notificación al cliente. El objetivo es brindar visibilidad en tiempo real del inventario, descontar el stock automáticamente al confirmarse un pedido para evitar sobreventas y centralizar el registro formal de cada pedido.

## Integrantes del Equipo (Scrum)
* **Ezequiel Adolfo Herrera Hernandez** (385717) - Product Owner
* **Carlos Alberto Díaz Sánchez** (385539) - Scrum Master
* **Edgar Alejandro Gutierrez Carrillo** (385655) - Developer
* **Diego Ivan Ibarra Lozoya** (373781) - Developer

## Instrucciones de instalación
1. Clona el repositorio:
```bash
git clone https://github.com/Donnie502/stride-and-co
```
2. Ingresa a la carpeta del backend desde la carpeta stride-and-co:
```bash
cd backend
```
3. Instala las dependencias necesarias:
```bash
npm install
```
4. Crea tu archivo de variables de entorno a partir del ejemplo y completa los valores (ver la sección [Autenticación](#autenticación)):
```bash
cp .env.example .env
```

## Ejecución del Proyecto
Puedes levantar el servidor utilizando los siguientes comandos dentro de la carpeta `backend/`:

**Modo desarrollo** (con recarga automática mediante supervisor)
```bash
npm run dev
```
**Modo producción**
```bash
npm start
```

## Pruebas y calidad de código
El proyecto cuenta con scripts para garantizar la calidad del código y el correcto funcionamiento de los endpoints.

**Análisis de código estático (ESLint)**
```bash
npm run lint
```
**Ejecución de pruebas automatizadas**
```bash
npm test
```
Las pruebas necesitan MySQL y MongoDB corriendo, ver [Pruebas de RBAC](#pruebas-de-rbac).

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
Define estas variables en tu archivo `.env` (usa `.env.example` como base). **No subas el `.env` al repositorio** y no escribas secretos reales en el README.

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
  "email": "ana@stride.co",
  "password": "Secret123"
}
```

Ejemplo con curl:
```bash
curl -X POST localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@stride.co","password":"Secret123"}'
```

Si las credenciales son correctas, la API responde `200` con los datos básicos del usuario (sin `password_hash` ni `salt_key`) y un JWT firmado cuyo payload solo contiene `sub`, el id del usuario:
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "first_name": "Ana",
      "last_name": "López",
      "email": "ana@stride.co",
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
  "first_name": "Ana",
  "last_name": "López",
  "email": "ana@stride.co",
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
| `admin` | Acceso total al sistema |
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

Todas las rutas de la tabla piden token (`authenticate`) y después el permiso (`authorize`). Las únicas rutas públicas son `POST /api/auth/login` y `GET /health`. `GET /api/auth/me` solo pide token.

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

1. Levanta la app una vez (`npm run dev`) para que se creen las tablas.
2. Corre el seeder:
```bash
cd backend
node seeders/rbac.js
```
3. Reinicia la app.

Al iniciar, la aplicación consulta la base de datos (JOIN de roles y permisos), separa cada `Permission.key` en recurso, acción y alcance, y le inyecta esa configuración a la librería `accesscontrol`, que usa el middleware `authorize`. Los permisos solo se leen al arrancar, así que si cambias `role_permissions` hay que reiniciar la app.

### Pruebas de RBAC

Las pruebas usan sus propias bases de datos para no tocar `stride_co`:

| Base de datos | Nombre | De dónde sale |
|---|---|---|
| MySQL | `stride_co_test` | `config/test.json` |
| MongoDB | `stride_co_test` | `MONGO_URI` en `test/setup-env.js` |

Antes de borrar algo, las pruebas revisan que el nombre de la base de datos termine en `_test`. Si no termina así, se cancelan.

**Requisitos**

* MySQL corriendo con el usuario de `config/default.json`. La base `stride_co_test` se crea sola si no existe.
* MongoDB en el puerto 27017. Con docker:
```bash
docker run -d --name stride-mongo -p 27017:27017 mongo:8
```

**Correr las pruebas** (dentro de `backend/`)
```bash
npm test
```

El script corre Jest con `--experimental-vm-modules` (lo necesita la librería `config`) y `--runInBand` (una suite a la vez, porque comparten la base de datos de pruebas).

`test/rbac.test.js` prueba los endpoints reales. Antes de las pruebas borra y crea las tablas en `stride_co_test`, corre `seeders/rbac.js`, carga los permisos con `initAccessControl()` y saca los tokens con `POST /api/auth/login`. No hay permisos escritos a mano ni mocks.

| Prueba | Resultado esperado |
|---|---|
| `admin` con `products:delete:any` borra un producto | 200 |
| `seller` sin `products:delete:any` borra un producto | 403 |
| `user` con `orders:read:own` ve su propia orden | 200 |
| `user` con `orders:read:own` ve la orden de otro usuario | 403 |
| `user` sin `orders:read:any` lista todas las órdenes | 403 |