const { Product } = require('../models/relationals');


function healthCheck(req, res) {
res.status(200).json({
status: "UP"
});
}

async function home(req, res) {
    const products = await Product.findAll();
    res.render('index', {title: 'Stride-Co', products: products});
}

module.exports = { healthCheck, home};