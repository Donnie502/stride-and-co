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
  { key: 'users:read:any', description: 'View any user' },
  { key: 'orders:delete:own', description: 'Delete own orders' }
];


const matriz = {
    user: [
        'products:read:any',
        'orders:create:any',
        'orders:read:own',
        'orders:update:own',
        'orders:delete:own'
    ],
    seller: [
        'products:read:any',
        'orders:create:any',
        'orders:read:own',
        'orders:read:any',
        'orders:update:own'
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