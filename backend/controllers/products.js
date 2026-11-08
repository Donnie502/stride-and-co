const { Product, ProductVariant } = require('../models/sql');

// READ
async function list(req, res, next) {
  try {
    const products = await Product.findAll({
      include: { model: ProductVariant, as: 'variants' }
    });
    res.json({ message: 'Products list', data: products });
  } catch (err) {
    next(err);
  }
}

// READ
async function find(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: { model: ProductVariant, as: 'variants' }
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: `Product found ${req.params.id}`, data: product });
  } catch (err) {
    next(err);
  }
}

// CREATE
async function create(req, res, next) {
  try {
    const { name, price, brand, description, category_id, active } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'The product name is required and must be text' });
    }

    if (price === undefined || typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'The product price is required and must be a positive number' });
    }
    
    const newProduct = await Product.create({
      name: name.trim(),
      price,
      brand,
      description,
      category_id,
      active
    });
    
    res.status(201).json({ message: 'Product created', data: newProduct });
  } catch (err) {
    next(err);
  }
}

// UPDATE
async function update(req, res, next) {
  try {
    const { name, price, brand, description, category_id, active } = req.body;

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let changes = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: 'The name is invalid' });
      }
      changes.name = name.trim();
    }
    if (price !== undefined) {
      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ message: 'The price is invalid' });
      }
      changes.price = price;
    }
    if (brand !== undefined) changes.brand = brand;
    if (description !== undefined) changes.description = description;
    if (category_id !== undefined) changes.category_id = category_id;
    if (active !== undefined) changes.active = active;

    await product.update(changes);
    res.json({ message: `Product updated ${req.params.id}`, data: product 
    });
  } catch (err) {
    next(err);
  }
}

// DELETE
async function destroy(req, res, next) {
  try {
    const id = req.params.id;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await product.destroy();
    res.json({ message: `Product deleted ${req.params.id}`, data: product });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, find, create, update, destroy };