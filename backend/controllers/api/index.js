const {Product } = require('../../models/sql');

function healthCheck(req, res) {
res.status(200).json({ status: "UP"});
}

async function home(req, res) {
    const products = await Product.findAll();
    res.render('index', { title: 'Stride-co', products: products });
}

module.exports = { healthCheck, home };