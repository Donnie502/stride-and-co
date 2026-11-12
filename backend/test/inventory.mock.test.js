const { list, find, create, update, destroy } = require('../controllers/inventory');
const { __ } = require('./helpers/i18nReq');
const { Inventory } = require('../models/sql');

jest.mock('../models/sql', () => ({
  Inventory: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  }
}));

describe('Inventory Controller - Unit Tests (Mocks)', () => {
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

  test('list() - responde 200 y devuelve el inventario', async () => {
    const mockInventory = [{ id: 1, variant_id: 1, stock: 50, reserved: 5 }];
    Inventory.findAll.mockResolvedValue(mockInventory);

    await list(req, res, next);

    expect(Inventory.findAll).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Inventory list',
      data: mockInventory
    });
  });

  test('find() - responde 404 si el inventario no existe', async () => {
    req.params.id = 999;
    Inventory.findByPk.mockResolvedValue(null);

    await find(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Inventory not found' });
  });

  test('find() - responde 200 y devuelve el inventario si existe', async () => {
    req.params.id = 1;
    const mockInventory = { id: 1, variant_id: 1, stock: 50 };
    Inventory.findByPk.mockResolvedValue(mockInventory);

    await find(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Inventory by id',
      data: mockInventory
    });
  });

  test('create() - responde 400 si falta variant_id', async () => {
    req.body = { stock: 10 }; 

    await create(req, res, next);

    expect(Inventory.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'variant_id is required and must be a number`' });
  });

  test('create() - responde 400 si stock es negativo', async () => {
    req.body = { variant_id: 1, stock: -5 }; 

    await create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'stock is required and must be a non-negative number' });
  });

  test('create() - responde 201 y crea el inventario con datos correctos', async () => {
    req.body = { variant_id: 1, stock: 100, reserved: 10 };
    
    const mockCreated = { id: 1, variant_id: 1, stock: 100, reserved: 10 };
    Inventory.create.mockResolvedValue(mockCreated);

    await create(req, res, next);

    expect(Inventory.create).toHaveBeenCalledWith({
      variant_id: 1,
      stock: 100,
      reserved: 10
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Inventory created', data: mockCreated });
  });

  test('update() - responde 404 si el inventario no existe', async () => {
    req.params.id = 999;
    req.body = { stock: 20 };
    Inventory.findByPk.mockResolvedValue(null);

    await update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('update() - responde 400 si reserved es negativo', async () => {
    req.params.id = 1;
    req.body = { reserved: -2 };
    
    const mockInventoryInstance = { id: 1 };
    Inventory.findByPk.mockResolvedValue(mockInventoryInstance);

    await update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'reserved must be a non-negative number' });
  });

  test('update() - actualiza los datos y responde 200', async () => {
    req.params.id = 1;
    req.body = { stock: 80 };
    
    const mockInventoryInstance = {
      id: 1,
      variant_id: 1,
      stock: 50,
      update: jest.fn().mockResolvedValue(true)
    };
    Inventory.findByPk.mockResolvedValue(mockInventoryInstance);

    await update(req, res, next);

    expect(mockInventoryInstance.update).toHaveBeenCalledWith({ stock: 80 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Inventory updated' }));
  });

  test('destroy() - responde 404 si el inventario no existe', async () => {
    req.params.id = 999;
    Inventory.findByPk.mockResolvedValue(null);

    await destroy(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('destroy() - elimina el registro y responde 200 si el inventario existe', async () => {
    req.params.id = 1;
    
    const mockInventoryInstance = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };
    Inventory.findByPk.mockResolvedValue(mockInventoryInstance);

    await destroy(req, res, next);

    expect(mockInventoryInstance.destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Inventory deleted' }));
  });
});