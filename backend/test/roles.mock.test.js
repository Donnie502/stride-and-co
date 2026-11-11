const { list, find, create, update, destroy } = require('../controllers/roles');
const { __ } = require('./helpers/i18nReq');
const { Role, Permission } = require('../models/sql');

jest.mock('../models/sql', () => ({
  Role: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  Permission: {}
}));

describe('Roles Controller - Unit Tests (Mocks)', () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: {}, body: {}, __ }; // __ traduce con en.json
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('list() - responde 200 y devuelve un arreglo de roles', async () => {
    const mockRoles = [{ id: 1, name: 'Admin', description: 'Admin Role' }];
    Role.findAll.mockResolvedValue(mockRoles);

    await list(req, res, next);

    expect(Role.findAll).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Roles list',
      data: mockRoles
    });
  });

  test('find() - responde 404 si el id del rol no existe', async () => {
    req.params.id = 999;
    Role.findByPk.mockResolvedValue(null);

    await find(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Role not found' });
  });

  test('find() - responde 200 y devuelve el rol si existe', async () => {
    req.params.id = 1;
    const mockRole = { id: 1, name: 'Admin' };
    Role.findByPk.mockResolvedValue(mockRole);

    await find(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Role by id',
      data: mockRole
    });
  });

  test('create() - responde 400 si faltan campos obligatorios', async () => {
    req.body = { name: 'Admin' }; 

    await create(req, res, next);

    expect(Role.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Required fields are missing' });
  });

  test('create() - responde 400 si name no es un string', async () => {
    req.body = { name: 123, description: 'Admin Role' }; 

    await create(req, res, next);

    expect(Role.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Name must be strings' });
  });

  test('create() - responde 201, crea el registro y asigna permisos', async () => {
    req.body = { name: 'Admin', description: 'Admin Role', permissionIds: [1, 2] };
    
    const mockCreated = { 
      id: 1, 
      name: 'Admin', 
      description: 'Admin Role',
      setPermissions: jest.fn().mockResolvedValue(true)
    };
    Role.create.mockResolvedValue(mockCreated);

    await create(req, res, next);

    expect(Role.create).toHaveBeenCalledWith({ name: 'Admin', description: 'Admin Role' });
    expect(mockCreated.setPermissions).toHaveBeenCalledWith([1, 2]);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Role created' }));
  });

  test('update() - responde 404 si se intenta actualizar un rol que no existe', async () => {
    req.params.id = 999;
    req.body = { name: 'Manager' };
    Role.findByPk.mockResolvedValue(null);

    await update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('update() - responde 400 si name está vacío o no es un string', async () => {
    req.params.id = 1;
    req.body = { name: '' };
    
    const mockRoleInstance = { id: 1 };
    Role.findByPk.mockResolvedValue(mockRoleInstance);

    await update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Name must be a non-empty string' });
  });

  test('update() - actualiza los datos y permisos, y responde 200', async () => {
    req.params.id = 1;
    req.body = { name: 'Manager', description: 'Store Manager', permissionIds: [3, 4] };
    
    const mockRoleInstance = {
      id: 1,
      name: 'Admin',
      update: jest.fn().mockResolvedValue(true),
      setPermissions: jest.fn().mockResolvedValue(true)
    };
    Role.findByPk.mockResolvedValue(mockRoleInstance);

    await update(req, res, next);

    expect(mockRoleInstance.update).toHaveBeenCalledWith({ name: 'Manager', description: 'Store Manager' });
    expect(mockRoleInstance.setPermissions).toHaveBeenCalledWith([3, 4]);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Role updated' }));
  });

  test('destroy() - responde 404 si se intenta eliminar un rol que no existe', async () => {
    req.params.id = 999;
    Role.findByPk.mockResolvedValue(null);

    await destroy(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('destroy() - elimina el registro y responde 200 si el rol existe', async () => {
    req.params.id = 1;
    
    const mockRoleInstance = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };
    Role.findByPk.mockResolvedValue(mockRoleInstance);

    await destroy(req, res, next);

    expect(mockRoleInstance.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Role deleted' }));
  });
});