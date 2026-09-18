# Stride & Co. - Sistema de Gestión y Ventas

## Descripción del Proyecto
Este proyecto busca digitalizar el flujo completo de venta para Stride & Co., permitiendo la publicación de catálogo, compra, actualización de estado y notificación al cliente. El objetivo es brindar visibilidad en tiempo real del inventario, descontar el stock automáticamente al confirmarse un pedido para evitar sobreventas y centralizar el registro formal de cada pedido.

## Integrantes del Equipo (Scrum)
* **Ezequiel Adolfo Herrera Hernandez** (385717) - Product Owner
* **Carlos Alberto Díaz Sánchez** (385539) - Scrum Master
* **Edgar Alejandro Gutierrez Carrillo** (385655) - Developer
* **Diego Ivan Ibarra Lozoya**(373781) - Developer

## Instrucciones de instalacion
1. Clona el repositorio:
    git clone https://github.com/Donnie502/stride-and-co
2. Ingresa a la carpeta del backend desde la carpeta stride-and-co:
    cd backend
3. Instala las dependencias necesarias:
    npm install

## Ejecucion del Proyecto
puedes levantar el servidor utilizando los siguientes comandos dentro de la carpeta backend/:

 Modo desarrollo (Con recarga automatica mediante supervisor)
    npm run dev
 Modo Produccion
    npm start

## Pruebas y calidad de codigo
El proyecto cuenta con scripts para garantizar la calidad del codigo y el correcto funcionamiento de los endpoints

 Analisis de codigo estatico (ESLint)
    npm run lint
 Ejecucion de pruebas automatizadas
    npm test
