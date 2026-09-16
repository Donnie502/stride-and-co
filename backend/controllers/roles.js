//Igual que users pero para roles
//CREATE
function create(req, res, next) {
    res.status(201).json({ 
        message: "Role created", 
        data: {} 
    });
}

//READ
function list(req, res, next) {
  res.json({ 
      message: "Roles list", 
      data: [] 
    });
}
function find(req, res, next) {
  res.json({ 
      message: "Role by id", 
      data: {} 
    });
}

//UPDATE
function update(req, res, next) {
  res.json({ 
      message: "Role updated", 
      data: {} 
    });
}

//DELETE
function destroy(req, res, next) {
  res.json({ 
      message: "Role deleted", 
      data: {} 
    });
}
module.exports = { list, create, find, update, destroy };