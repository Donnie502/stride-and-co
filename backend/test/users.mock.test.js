const { list, find, create, update, destroy } = require('../controllers/users');
const { User } = require('../models/sql');
const { hashPassword } = require('../utils/password');

jest.mock('../models/sql', () => ({
  User: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  Role: {} 
}));


jest.mock('../utils/password', () => ({
  hashPassword: jest.fn()
}));

describe('Users Controller - Unit Tests (Mocks)', () => {
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

  //PRUEBAS PARA READ
  test('list() - responde 200 y devuelve un arreglo de usuarios', async () => {
    const mockUsers = [{ id: 1, first_name: 'Edgar', email: 'edgar@prueba.com', role_id: 1 }];
    User.findAll.mockResolvedValue(mockUsers);

    await list(req, res, next);

    expect(User.findAll).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Users list',
      data: mockUsers
    });
  });

  test('find() - responde 404 si el id del usuario no existe', async () => {
    req.params.id = 999;
    User.findByPk.mockResolvedValue(null);

    await find(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  test('find() - responde 200 y devuelve el usuario si existe', async () => {
    req.params.id = 1;
    const mockUser = { id: 1, first_name: 'Edgar' };
    User.findByPk.mockResolvedValue(mockUser);

    await find(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      message: 'User by id',
      data: mockUser
    });
  });

  // PRUEBAS PARA CREATE
  test('create() - responde 400 si faltan campos obligatorios', async () => {
    req.body = { name: 'Juan' }; // Faltan lastName, email, roleId, password

    await create(req, res, next);

    expect(User.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Required fields are missing' });
  });

  test('create() - responde 201 y crea el registro si los datos son correctos', async () => {
    req.body = { name: 'Edgar', lastName: 'Gutierrez', email: 'e@prueba.com', roleId: 1, password: 'password123' };
    

    hashPassword.mockResolvedValue({ password_hash: 'hash123', salt_key: 'salt123' });
    
    const mockCreated = { id: 2, first_name: 'Edgar', last_name: 'Gutierrez' };
    User.create.mockResolvedValue(mockCreated);

    await create(req, res, next);

    expect(hashPassword).toHaveBeenCalledWith('password123');
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      first_name: 'Edgar',
      last_name: 'Gutierrez',
      password_hash: 'hash123'
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User created' }));
  });

  //PRUEBAS PARA UPDATE
  test('update() - responde 404 si se intenta actualizar un usuario que no existe', async () => {
    req.params.id = 999;
    req.body = { name: 'Pedro' };
    User.findByPk.mockResolvedValue(null);

    await update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('update() - actualiza los datos y responde 200 si el usuario existe', async () => {
    req.params.id = 1;

    req.body = { name: 'Pedro' };
    
    const mockUserInstance = {
      id: 1,
      first_name: 'Edgar',
      update: jest.fn().mockResolvedValue(true)
    };
    User.findByPk.mockResolvedValue(mockUserInstance);

    await update(req, res, next);


    expect(mockUserInstance.update).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Pedro' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User updated' }));
  });

  //PRUEBAS PARA DELETE
  test('destroy() - responde 404 si se intenta eliminar un usuario que no existe', async () => {
    req.params.id = 999;
    User.findByPk.mockResolvedValue(null);

    await destroy(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('destroy() - elimina el registro y responde 200 si el usuario existe', async () => {
    req.params.id = 1;
    
    const mockUserInstance = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };
    User.findByPk.mockResolvedValue(mockUserInstance);

    await destroy(req, res, next);

    expect(mockUserInstance.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User deleted' }));
  });
});