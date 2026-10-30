const { sequelize, Role, Permission} = require('../models/relationals');

const roles = [
    {name: 'user', description: 'Buys products and views own orders'},
    {name: 'seller', description: 'Manages sales and views all orders'},
    {name: 'admin', description: 'Full system access'}
];

const permisos = [
  { key: 'products:read:any', description: 'View any product' },
  { key: 'products:create:any', description: 'Create products' },
  { key: 'products:update:any', description: 'Update any product' },
  { key: 'products:delete:any', description: 'Delete any product' },
  { key: 'orders:create:any', description: 'Create orders' },
  { key: 'orders:read:own', description: 'View own orders' },
  { key: 'orders:read:any', description: 'View any order' },
  { key: 'orders:update:own', description: 'Update own orders' },
  { key: 'orders:delete:own', description: 'Delete own orders' },
  { key: 'users:read:any', description: 'View any user' },
  { key: 'users:create:any', description: 'Create users' },
  { key: 'users:update:any', description: 'Update any user' },
  { key: 'users:delete:any', description: 'Delete any user' },
  { key: 'customers:create:any', description: 'Create customer profiles' },
  { key: 'customers:read:own', description: 'View own customer profile' },
  { key: 'customers:read:any', description: 'View any customer profile' },
  { key: 'customers:update:own', description: 'Update own customer profile' },
  { key: 'customers:delete:own', description: 'Delete own customer profile' },
  { key: 'roles:create:any', description: 'Create roles' },
  { key: 'roles:read:any', description: 'View any role' },
  { key: 'roles:update:any', description: 'Update any role' },
  { key: 'roles:delete:any', description: 'Delete any role' },
  { key: 'permissions:create:any', description: 'Create permissions' },
  { key: 'permissions:read:any', description: 'View any permission' },
  { key: 'permissions:update:any', description: 'Update any permission' },
  { key: 'permissions:delete:any', description: 'Delete any permission' },
  { key: 'variants:create:any', description: 'Create variants' },
  { key: 'variants:read:any', description: 'View any variant' },
  { key: 'variants:update:any', description: 'Update any variant' },
  { key: 'variants:delete:any', description: 'Delete any variant' },
  { key: 'inventory:create:any', description: 'Create inventory records' },
  { key: 'inventory:read:any', description: 'View any inventory record' },
  { key: 'inventory:update:any', description: 'Update any inventory record' },
  { key: 'inventory:delete:any', description: 'Delete any inventory record' }
];


const matriz = {
    user: [
        'products:read:any',
        'orders:create:any',
        'orders:read:own',
        'orders:update:own',
        'orders:delete:own',
        'customers:create:any',
        'customers:read:own',
        'customers:update:own',
        'customers:delete:own',
        'variants:read:any'
    ],
    seller: [
        'products:read:any',
        'orders:create:any',
        'orders:read:own',
        'orders:read:any',
        'orders:update:own',
        'orders:delete:own',
        'customers:create:any',
        'customers:read:own',
        'customers:read:any',
        'customers:update:own',
        'customers:delete:own',
        'variants:read:any',
        'inventory:read:any'
    ],
    admin: permisos.map(p => p.key)

};

async function main() {
    try {
        await sequelize.authenticate();

        // Fase 1 Roles
        const rolesbyName = {};
        for (const r of roles) {
            const [rol, create] = await Role.findOrCreate({
                where: {name: r.name},
                defaults: { description: r.description}
            });
            rolesbyName[r.name] = rol;
            console.log(`Rol ${r.name}: ${create ? 'creado' : 'ya existía'}`);
        }

        // Fase 2 Permission
        const permissionbyKey = {};
        for (const p of permisos) {
            const [permiso, create] = await Permission.findOrCreate({
                where: { key: p.key},
                defaults: { description: p.description}
            });
            permissionbyKey[p.key] = permiso;
            console.log(`Permiso ${p.key}: ${create ? 'creado' : 'ya existía'}`);
        }
        // Fase 3
        for (const [nombreRol, keys] of Object.entries(matriz)) {
            const rol = rolesbyName[nombreRol];
            const list = keys.map(key => permissionbyKey[key]);

            await rol.setPermissions(list);
            console.log(`Rol ${nombreRol}: ${list.length} permisos asignados`);
        }

    } catch (err) {
        console.error('Fallo el seed:', err);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

main(); 