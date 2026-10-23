const { Product } = require('../models/relationals');

// READ
async function list(req, res, next) {
  try {
    const products = await Product.findAll();
    res.json({ message: 'GET products', data: products });
  } catch (err) {
    next(err);
  }
}

// READ
async function find(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: `GET product ${req.params.id}`, data: product });
  } catch (err) {
    next(err);
  }
}

// CREATE
async function create(req, res, next) {
  try {
    const { name, price, brand, description, category_id, active } = req.body;
    
    if (!name || price === undefined) {
      return res.status(400).json({ message: 'name and price are required' });
    }
    
    const newProduct = await Product.create({
      name,
      price,
      brand,
      description,
      category_id,
      active
    });
    
    res.status(201).json({ message: 'POST product created', data: newProduct });
  } catch (err) {
    next(err);
  }
}

// UPDATE
async function update(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await product.update(req.body);
    res.json({ message: `PUT product ${req.params.id}`, data: product });
  } catch (err) {
    next(err);
  }
}

// DELETE
async function destroy(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await product.destroy();
    res.json({ message: `DELETE product ${req.params.id}`, data: product });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, find, create, update, destroy };