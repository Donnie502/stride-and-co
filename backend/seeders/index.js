const mongoose = require('mongoose');
const { sequelize, Role, User, Product, ProductVariant, Inventory } = require('../models/sql');
const { Customer, Order } = require('../models/mongo');
const connectMongo = require('../config/mongoose');
const { hashPassword } = require('../utils/password');
const { seedRbac } = require('./rbac');

// Contraseñas públicas exclusivas de las cuentas de demostración.
const demoUsers = [
    { role: 'admin', email: 'admin@demo.stride.example', password: 'DemoAdmin2026!' },
    { role: 'seller', email: 'seller@demo.stride.example', password: 'DemoSeller2026!' },
    { role: 'user', email: 'user@demo.stride.example', password: 'DemoUser2026!' }
];

const catalog = [
    { name: 'Tenis Run Demo', price: '1299.99', sku: 'DEMO-RUN-26', size: '26 MX', color: 'Negro' },
    { name: 'Tenis Urban Demo', price: '999.90', sku: 'DEMO-URBAN-27', size: '27 MX', color: 'Blanco' }
];

async function seedDemoData() {
    const users = {};
    for (const demo of demoUsers) {
        const role = await Role.findOne({ where: { name: demo.role } });
        if (!role) throw new Error(`Falta el rol ${demo.role}; ejecuta primero el seed RBAC`);

        let user = await User.findOne({ where: { email: demo.email } });
        if (!user) {
            const credentials = await hashPassword(demo.password);
            user = await User.create({
                first_name: demo.role,
                last_name: 'Demo',
                email: demo.email,
                role_id: role.id,
                active: true,
                ...credentials
            });
        }
        if (!user.active || user.role_id !== role.id) {
            throw new Error(`La cuenta ${demo.email} ya existe con otro rol o está inactiva`);
        }
        users[demo.role] = user;
    }

    const products = [];
    for (const entry of catalog) {
        const [product] = await Product.findOrCreate({
            where: { name: entry.name, brand: 'Stride Demo' },
            defaults: { price: entry.price, description: 'Producto de demostración', active: true }
        });
        const [variant] = await ProductVariant.findOrCreate({
            where: { sku: entry.sku },
            defaults: { product_id: product.id, size: entry.size, color: entry.color, active: true }
        });
        if (variant.product_id !== product.id) throw new Error(`El SKU ${entry.sku} pertenece a otro producto`);
        await Inventory.findOrCreate({
            where: { variant_id: variant.id },
            defaults: { stock: 20, reserved: 0 }
        });
        products.push(product);
    }

    for (const [index, demo] of demoUsers.entries()) {
        const user = users[demo.role];
        let customer = await Customer.findOne({ userId: user.id });
        if (!customer) {
            customer = await Customer.create({
                userId: user.id,
                email: demo.email,
                phone: '6140000000',
                addresses: [{
                    type: 'SHIPPING', street: 'Calle Demo', number: '100', city: 'Chihuahua',
                    state: 'Chihuahua', zipCode: '31000', country: 'México'
                }]
            });
        }

        // Identificadores reservados para estas órdenes de demostración.
        const id = new mongoose.Types.ObjectId(`73747269646564656d6f000${index + 1}`);
        const existing = await Order.findById(id);
        if (existing) {
            if (String(existing.customerId) !== String(customer._id)) {
                throw new Error(`La orden demo ${id} pertenece a otro cliente`);
            }
            continue;
        }
        const product = products[index % products.length];
        await Order.create({
            _id: id,
            customerId: customer._id,
            salesPersonId: users.seller.id,
            paymentMethod: 'CASH',
            totals: { subtotal: String(product.price), shipping: '0', discount: '0', total: String(product.price) },
            shippingAddress: {
                street: 'Calle Demo', number: '100', city: 'Chihuahua', state: 'Chihuahua',
                postalCode: '31000', country: 'México'
            },
            items: [{ productId: product.id, quantity: 1, unitPrice: String(product.price) }],
            statusHistory: [{ status: 'PENDING', changedById: users.seller.id }]
        });
    }
}

function errorCodes(error, visited = new Set()) {
    if (!error || typeof error !== 'object' || visited.has(error)) return [];
    visited.add(error);
    const codes = typeof error.code === 'string' ? [error.code] : [];
    const causes = [error.original, error.parent, error.cause, ...(Array.isArray(error.errors) ? error.errors : [])];
    return [...new Set([...codes, ...causes.flatMap(cause => errorCodes(cause, visited))])];
}

async function main() {
    let stage = 'conexión a PostgreSQL';
    try {
        await sequelize.authenticate();
        stage = 'conexión a MongoDB';
        await connectMongo();
        stage = 'creación de tablas PostgreSQL';
        // Crea tablas faltantes sin alterar ni borrar las existentes.
        await sequelize.sync();
        stage = 'roles y permisos RBAC';
        await seedRbac();
        stage = 'datos de demostración';
        await seedDemoData();
        console.log('Seed completo: roles, permisos y datos de demostración disponibles.');
    } catch (err) {
        const codes = errorCodes(err);
        console.error(`Falló el seed durante ${stage}: ${err.message || err.name || 'Error sin mensaje'}`);
        if (codes.length) console.error(`Códigos: ${codes.join(', ')}`);
        if (codes.includes('ECONNREFUSED')) {
            console.error('El servidor de base de datos rechazó la conexión. Revisa que esté iniciado y que el host y puerto sean correctos.');
        }
        process.exitCode = 1;
    } finally {
        const results = await Promise.allSettled([sequelize.close(), mongoose.disconnect()]);
        if (results.some(result => result.status === 'rejected')) {
            console.error('No se pudieron cerrar todas las conexiones del seed.');
            process.exitCode = 1;
        }
    }
}

if (require.main === module) main();

module.exports = { seedDemoData, errorCodes };
