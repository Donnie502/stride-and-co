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
| `seller` | Gestiona ventas y consulta todas las órdenes |
| `user` | Compra productos y consulta sus propias órdenes |

### Convención de `Permission.key`

Cada permiso se identifica con `recurso:acción:alcance`:

```
orders:read:own
  |     |    |
  |     |    +-- alcance: own (solo recursos del usuario) o any (cualquiera)
  |     +------- acción: create, read, update, delete
  +------------- recurso: products, orders, users
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
| `users:read:any` | ✓ | × | × |

### Endpoints protegidos

| Endpoint | Permiso requerido |
|---|---|
| `GET /products` | `products:read:any` |
| `POST /products` | `products:create:any` |
| `PUT /products/:id` | `products:update:any` |
| `DELETE /products/:id` | `products:delete:any` |
| `GET /orders` | `orders:read:any` |
| `GET /orders/:id` | `orders:read:own` / `orders:read:any` |
| `POST /orders` | `orders:create:any` |
| `PUT /orders/:id` | `orders:update:own` |
| `GET /users` | `users:read:any` |

### Ejemplo de permiso `own`

`orders:read:own`: un `user` solo puede consultar órdenes que le pertenecen. El middleware compara el dueño de la orden (`Order.customerId` → `Customer.userId`) con el id del usuario autenticado. Si no coinciden, responde `403`.

### Ejemplo de permiso `any`

`products:delete:any`: solo `admin` puede eliminar cualquier producto. Un `seller` o un `user` que lo intente recibe `403`.

### Cómo se cargan los permisos desde la base de datos

Los permisos no están escritos en el código. Las tablas `roles`, `permissions` y `role_permissions` son la fuente de verdad. Se poblan con el seeder (idempotente):

```bash
cd backend
node seeders/rbac.js
```

Al iniciar, la aplicación consulta la base de datos (JOIN de roles y permisos), separa cada `Permission.key` en recurso, acción y alcance, y le inyecta esa configuración a la librería `accesscontrol`, que usa el middleware `authorize`.