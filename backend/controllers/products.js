let products = [
  { id: 1, name: 'Zapatilla Runner X', brand: 'Stride', price: 89.99, active: true },
  { id: 2, name: 'Zapatilla Trail Pro', brand: 'Stride', price: 119.99, active: true },
];

exports.list = (req, res) => {
  res.json({ message: 'GET products', data: products });
};

exports.find = (req, res) => {
  const id = Number(req.params.id);
  const product = products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.json({ message: `GET product ${id}`, data: product });
};

exports.create = (req, res) => {
  const { name, brand, price } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ message: 'name and price are required' });
  }
  const newProduct = {
    id: products.length + 1,
    name,
    brand: brand || '',
    price,
    active: true,
  };
  products.push(newProduct);
  res.status(201).json({ message: 'POST product created', data: newProduct });
};

exports.update = (req, res) => {
  const id = Number(req.params.id);
  const product = products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  const { name, brand, price, active } = req.body;
  if (name) product.name = name;
  if (brand) product.brand = brand;
  if (price !== undefined) product.price = price;
  if (active !== undefined) product.active = active;
  res.json({ message: `PUT product ${id}`, data: product });
};

exports.destroy = (req, res) => {
  const id = Number(req.params.id);
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }
  const [deleted] = products.splice(index, 1);
  res.json({ message: `DELETE product ${id}`, data: deleted });
};