const { list, find, create, update, destroy } = require('../controllers/products');
const { Product } = require('../models/sql');

// Simulamos el modelo completo de Sequelize
jest.mock('../models/sql', () => ({
  Product: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  }
}));

describe('Products Controller - Unit Tests (Mocks)', () => {
  let req, res, next;

  // Antes de cada prueba, preparamos un objeto falso (mock)
  beforeEach(() => {
    req = { params: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(), // Permite encadenar res.status().json()
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks(); // Limpiamos el historial para que no se mezclen las pruebas
  });

  //PRUEBAS PARA READ
  test('list() - responde 200 y devuelve un arreglo de productos', async () => {
    const mockProducts = [{ id: 1, name: 'Tenis Stride', price: 1000 }];
    Product.findAll.mockResolvedValue(mockProducts); // Obligamos a la BD falsa a devolver esto

    await list(req, res, next);

    expect(Product.findAll).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Products list',
      data: mockProducts
    });
  });

  test('find() - responde 404 si el id del producto no existe', async () => {
    req.params.id = 999;
    Product.findByPk.mockResolvedValue(null); // Simulamos que no encontró nada

    await find(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Product not found' });
  });

  // PRUEBAS PARA CREATE
  test('create() - frena la petición y responde 400 si faltan campos (Ej. name y price)', async () => {
    req.body = { brand: 'Nike' }; 

    await create(req, res, next);

    expect(Product.create).not.toHaveBeenCalled(); // Aseguramos que la BD ni siquiera se toco
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('create() - responde 201 y crea el registro si los datos son correctos', async () => {
    req.body = { name: 'Sudadera', price: 500 };
    const mockCreated = { id: 2, ...req.body };
    Product.create.mockResolvedValue(mockCreated); // Simulamos la creación exitosa

    await create(req, res, next);

    expect(Product.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // PRUEBAS PARA UPDATE
  test('update() - responde 404 si se intenta actualizar un producto que no existe', async () => {
    req.params.id = 999;
    req.body = { price: 800 };
    Product.findByPk.mockResolvedValue(null);

    await update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('update() - actualiza los datos y responde 200 si el producto existe', async () => {
    req.params.id = 1;
    req.body = { price: 800 };
    
    
    const mockProductInstance = {
      id: 1,
      name: 'Sudadera',
      price: 500,
      update: jest.fn().mockResolvedValue(true)
    };
    Product.findByPk.mockResolvedValue(mockProductInstance);

    await update(req, res, next);

    expect(mockProductInstance.update).toHaveBeenCalledWith(expect.objectContaining({ price: 800 }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Product updated 1' }));
  });

  // PRUEBAS PARA DELETE
  test('destroy() - responde 404 si se intenta eliminar un producto que no existe', async () => {
    req.params.id = 999;
    Product.findByPk.mockResolvedValue(null);

    await destroy(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('destroy() - elimina el registro y responde 200 si el producto existe', async () => {
    req.params.id = 1;
    
    // Simulamos una "instancia" de Sequelize que tiene su propio método destroy()
    const mockProductInstance = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };
    Product.findByPk.mockResolvedValue(mockProductInstance);

    await destroy(req, res, next);

    expect(mockProductInstance.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Product deleted 1' }));
  });
});