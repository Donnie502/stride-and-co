const {User, Role} = require('../models/sql')
const { hashPassword }= require('../utils/password');


//CREATE
//CREATE
async function create(req, res, next) {
  try {
    const name = req.body.name;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const roleId = req.body.roleId;
    const password = req.body.password;

    if (!name || !lastName || !email || !roleId || !password) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const { password_hash, salt_key } = await hashPassword(password);
    const user = await User.create({
      first_name: name, last_name: lastName, email: email, role_id: roleId,
      password_hash, salt_key
    });
    res.status(201).json({
        message: "User created",
        data: user
    });
  } catch (err) {
    next(err);
  }
}

//READ
async function list(req, res, next) {
  try {
    const users = await User.findAll({ attributes:['first_name', 'last_name', 'email','active','role_id'], include: { model: Role, as: 'role' }});
    res.json({
      message: "Users list",
      data: users
    });
  } catch (err) {
    next(err);
  }
}

async function find(req, res, next) {
  const id = req.params.id;
  try {
    const user = await User.findByPk(id, { attributes:['id','first_name', 'last_name', 'email','active','role_id'], include: { model: Role, as: 'role' }});
    
    if(!user) return res.status(404).json({ message: 'User not found'});
    
    res.json({
      message: "User by id",
      data: user
    });

  } catch (err) {
    next(err);
  }
}

//UPDATE
async function update(req, res, next) {
  try {
    const id = req.params.id;
    const name = req.body.name;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const roleId = req.body.roleId;
    const password = req.body.password;

    const user = await User.findByPk(id);
    if(!user) return res.status(404).json({ message: 'User not found'});

    let changes = {};
    if (name) changes.first_name = name;
    if (lastName) changes.last_name = lastName;
    if (email) changes.email = email;
    if (roleId) changes.role_id = roleId;

    if (password !== undefined) {
      if (typeof password !== 'string' || !password) {
        return res.status(400).json({ message: 'Password must be a non-empty string' });
      }
      const { password_hash, salt_key } = await hashPassword(password);
      changes.password_hash = password_hash;
      changes.salt_key = salt_key;
    }
    await user.update(changes);
    res.json({
      message: "User updated",
      data: user
    });
  } catch (err) {
    next(err);
  }
}


//DELETE
async function destroy(req, res, next) {
  try {
    const id = req.params.id;
    const user = await User.findByPk(id);
    if(!user) return res.status(404).json({ message: 'User not found'});
    await user.destroy();
    res.json({
    message: "User deleted",
    data: user
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {list, create, find, update, destroy};