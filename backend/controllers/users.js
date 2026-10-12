const {User, Role} = require('../models/relationals')
const { hashPassword }= require('../utils/password');


//CREATE
async function create(req, res, next) {
  const name = req.body.name;
  const lastName = req.body.lastName;
  const email = req.body.email;
  const roleId = req.body.roleId;
  const password = req.body.password;
  const passwordData = await hashPassword(password);
  const user = await User.create({first_name: name, last_name: lastName, email: email, role_id: roleId,
    password_hash: passwordData.securePassword, salt_key: passwordData.saltKey });
    res.status(201).json({
        message: "User created",
        data: user
    });
}

//READ
async function list(req, res, next) {
  const users = await User.findAll({ attributes:['first_name', 'last_name', 'email'], include: { model: Role, as: 'role' }});
  res.json({
    message: "Users list",
    data: users
  });
}

async function find(req, res, next) {
  const id = req.params.id;
  const user = await User.findByPk(id, { attributes:['first_name', 'last_name', 'email'], include: { model: Role, as: 'role' }});
    res.json({
    message: "User by id",
    data: user
  });   
}

//UPDATE
async function update(req, res, next) {
    const id = req.params.id;
    const name = req.body.name;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const roleId = req.body.roleId;
    const user = await User.findByPk(id);
    if(!user) return res.status(404).json({ message: 'User not found'});
    let changes = {};
    changes.first_name = name ? name: user.first_name;
    changes.last_name = lastName ? lastName: user.last_name;
    changes.email = email ? email: user.email;
    changes.role_id = roleId ? roleId: user.role_id;

    await user.update(changes);

    res.json({
    message: "User updated",
    data: user
    });
}


//DELETE
async function destroy(req, res, next) {
    const id = req.params.id;
    const user = await User.findByPk(id);
    if(!user) return res.status(404).json({ message: 'User not found'});
    await user.destroy();
    res.json({
    message: "User deleted",
    data: user
    });
}

module.exports = {list, create, find, update, destroy};