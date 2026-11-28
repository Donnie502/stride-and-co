const { Product } = require('../../models/sql');

async function home(req, res, next) {
  try {
    const products = await Product.findAll();
    res.render('index', { title: 'Stride-Co', products });
  } catch (err) {
    next(err);
  }
}

module.exports = { home };