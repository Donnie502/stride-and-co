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