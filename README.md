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

Si las credenciales son correctas, la API responde `200` con un JWT firmado (el payload solo contiene `sub`, el id del usuario):
```json
{
  "data": {
    "token": "<jwt>"
  }
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