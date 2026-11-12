const { createVariant, getVariant, getVariantById, putVariant, destroyVariant } = require('../controllers/variants');
const { __ } = require('./helpers/i18nReq');
const { ProductVariant } = require('../models/sql');

jest.mock('../models/sql', () => ({
  ProductVariant: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  }
}));

describe('Variants Controller - Unit Tests (Mocks)', () => {
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

  test('getVariant() - responde 200 y devuelve un arreglo de variantes', async () => {
    const mockVariants = [{ id: 1, sku: 'SKU123', size: 'M', color: 'Red' }];
    ProductVariant.findAll.mockResolvedValue(mockVariants);

    await getVariant(req, res, next);

    expect(ProductVariant.findAll).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Variants list',
      data: mockVariants
    });
  });

  test('getVariantById() - responde 404 si la variante no existe', async () => {
    req.params.id = 999;
    ProductVariant.findByPk.mockResolvedValue(null);

    await getVariantById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Variant not found' });
  });

  test('getVariantById() - responde 200 y devuelve la variante si existe', async () => {
    req.params.id = 1;
    const mockVariant = { id: 1, sku: 'SKU123' };
    ProductVariant.findByPk.mockResolvedValue(mockVariant);

    await getVariantById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Variant found by Id',
      data: mockVariant
    });
  });

  test('createVariant() - responde 400 si falta product_id', async () => {
    req.body = { sku: 'SKU123', size: 'M', color: 'Red' }; 

    await createVariant(req, res, next);

    expect(ProductVariant.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'The product ID is required and must be a number' });
  });

  test('createVariant() - responde 400 si falta sku', async () => {
    req.body = { product_id: 1, size: 'M', color: 'Red' }; 

    await createVariant(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'The SKU is required' });
  });

  test('createVariant() - responde 201 y crea la variante con datos correctos', async () => {
    req.body = { product_id: 1, sku: ' SKU123 ', size: ' M ', color: ' Red ' };
    
    const mockCreated = { id: 1, product_id: 1, sku: 'SKU123', size: 'M', color: 'Red' };
    ProductVariant.create.mockResolvedValue(mockCreated);

    await createVariant(req, res, next);

    expect(ProductVariant.create).toHaveBeenCalledWith({
      product_id: 1,
      sku: 'SKU123',
      size: 'M',
      color: 'Red',
      active: undefined
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Variant created', data: mockCreated });
  });

  test('putVariant() - responde 404 si la variante no existe', async () => {
    req.params.id = 999;
    req.body = { sku: 'SKU999' };
    ProductVariant.findByPk.mockResolvedValue(null);

    await putVariant(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('putVariant() - responde 400 si sku es invalido', async () => {
    req.params.id = 1;
    req.body = { sku: '   ' };
    
    const mockVariantInstance = { id: 1 };
    ProductVariant.findByPk.mockResolvedValue(mockVariantInstance);

    await putVariant(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'The SKU is invalid' });
  });

  test('putVariant() - actualiza los datos y responde 200', async () => {
    req.params.id = 1;
    req.body = { sku: ' SKU002 ', size: ' L ' };
    
    const mockVariantInstance = {
      id: 1,
      sku: 'SKU001',
      update: jest.fn().mockResolvedValue(true)
    };
    ProductVariant.findByPk.mockResolvedValue(mockVariantInstance);

    await putVariant(req, res, next);

    expect(mockVariantInstance.update).toHaveBeenCalledWith({ sku: 'SKU002', size: 'L' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Variant updated' }));
  });

  test('destroyVariant() - responde 404 si la variante no existe', async () => {
    req.params.id = 999;
    ProductVariant.findByPk.mockResolvedValue(null);

    await destroyVariant(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('destroyVariant() - elimina el registro y responde 200 si la variante existe', async () => {
    req.params.id = 1;
    
    const mockVariantInstance = {
      id: 1,
      destroy: jest.fn().mockResolvedValue(true)
    };
    ProductVariant.findByPk.mockResolvedValue(mockVariantInstance);

    await destroyVariant(req, res, next);

    expect(mockVariantInstance.destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Variant deleted' }));
  });
});