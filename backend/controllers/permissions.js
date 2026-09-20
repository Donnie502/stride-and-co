let permissions = [
  { id: 1, key: 'users.create', description: 'Crear usuarios' },
  { id: 2, key: 'users.read', description: 'Consultar usuarios' },
  { id: 3, key: 'products.manage', description: 'Administrar productos' },
];

exports.list = (req, res) => {
  res.json({ message: 'GET permissions', data: permissions });
};

exports.find = (req, res) => {
  const id = Number(req.params.id);
  const permission = permissions.find((p) => p.id === id);
  if (!permission) {
    return res.status(404).json({ message: 'Permission not found' });
  }
  res.json({ message: `GET permission ${id}`, data: permission });
};

exports.create = (req, res) => {
  const { key, description } = req.body;
  if (!key) {
    return res.status(400).json({ message: 'key is required' });
  }
  const newPermission = {
    id: permissions.length + 1,
    key,
    description: description || '',
  };
  permissions.push(newPermission);
  res.status(201).json({ message: 'POST permission created', data: newPermission });
};

exports.update = (req, res) => {
  const id = Number(req.params.id);
  const permission = permissions.find((p) => p.id === id);
  if (!permission) {
    return res.status(404).json({ message: 'Permission not found' });
  }
  const { key, description } = req.body;
  if (key) permission.key = key;
  if (description) permission.description = description;
  res.json({ message: `PUT permission ${id}`, data: permission });
};

exports.destroy = (req, res) => {
  const id = Number(req.params.id);
  const index = permissions.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Permission not found' });
  }
  const [deleted] = permissions.splice(index, 1);
  res.json({ message: `DELETE permission ${id}`, data: deleted });
};