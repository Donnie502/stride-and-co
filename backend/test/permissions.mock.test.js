const { list, find, create, update, destroy } = require('../controllers/permissions');
const Permission = require('../models/sql/Permission');

jest.mock('../models/sql/Permission', () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn()
}));

describe('Permissions Controller - Unit Tests (Mocks)', () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('list() - responde 200 y devuelve un arreglo de permisos', async () => {
    const mockPermissions = [{ id: 1, key: 'users:read:any' }];
    Permission.findAll.mockResolvedValue(mockPermissions);

    await list(req, res, next);

    expect(Permission.findAll).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Permissions list',
      data: mockPermissions
    });
  });

  test('find() - responde 404 si el permiso no existe', async () => {
    req.params.id = 999;
    Permission.findByPk.mockResolvedValue(null);

    await find(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Permission not found' });
  });

  test('find() - responde 200 y devuelve el permiso si existe', async () => {
    req.params.id = 1;
    const mockPermission = { id: 1, key: 'users:read:any' };
    Permission.findByPk.mockResolvedValue(mockPermission);

    await find(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Permission by id',
      data: mockPermission
    });
  });

  test('create() - responde 400 si falta el key', async () => {
    req.body = { description: 'Read users' }; 

    await create(req, res, next);

    expect(Permission.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'key is required and must be a non-empty string' });
  });

  test('create() - responde 400 si el key esta vacio', async () => {
    req.body = { key: '   ' }; 

    await create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'key is required and must be a non-empty string' });
  });

  test('create() - responde 201 y crea el permiso con datos correctos', async () => {
    req.body = { key: ' users:write:any ', description: 'Write users' };
    
    const mockCreated = { id: 1, key: 'users:write:any', description: 'Write users' };
    Permission.create.mockResolvedValue(mockCreated);

    await create(req, res, next);

    expect(Permission.create).toHaveBeenCalledWith({
      key: 'users:write:any',
      description: 'Write users'
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Permission created', data: mockCreated });
  });

  test('update() - responde 404 si el permiso no existe', async () => {
    req.params.id = 999;
    req.body = { key: 'users:delete:any' };
    Permission.findByPk.mockResolvedValue(null);

    await update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('update() - responde 400 si el key es invalido', async () => {
    req.params.id = 1;
    req.body = { key: '   ' };
    
    const mockPermissionInstance = { id: 1 };
    Permission.findByPk.mockResolvedValue(mockPermissionInstance);

    await update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'The key is invalid' });
  });

  test('update() - actualiza los datos y responde 200', async () => {
    req.params.id = 1;
    req.body = { key: ' users:read:own ', description: 'Read own user' };
    
    const mockPermissionInstance = {
      id: 1,
      key: 'users:read:any',
      update: jest.fn().mockResolvedValue(true)
    };
    Permission.findByPk.mockResolvedValue(mockPermissionInstance);

    await update(req, res, next);

    expect(mockPermissionInstance.update).toHaveBeenCalledWith({ key: 'users:read:own', description: 'Read own user' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Permission updated' }));
  });

  test('destroy() - responde 404 si el permiso no existe', async () => {
    req.params.id = 999;
    Permission.findByPk.mockResolvedValue(null);

    await destroy(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('destroy() - elimina el registro y responde 200 si el permiso existe', async () => {
    req.params.id = 1;
    
    const mockPermissionInstance = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };
    Permission.findByPk.mockResolvedValue(mockPermissionInstance);

    await destroy(req, res, next);

    expect(mockPermissionInstance.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Permission deleted' }));
  });
});