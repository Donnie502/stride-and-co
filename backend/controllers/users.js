
//CREATE
function create(req, res, next) {
    res.status(201).json({
        message: "User created",
        data:{}
    });
}

//READ
function list(req, res, next) {
  res.json({
    message: "Users list",
    data: []

  });
}

function find(req, res, next) {
    res.json({
    message: "User by id",
    data: {}

  });   
}

//UPDATE
function update(req, res, next) {
    res.json({
    message: "User updated",
    data: {}

    });
}


//DELETE
function destroy(req, res, next) {
    res.json({
    message: "User deleted",
    data: {}

    });
}

module.exports = {list, create, find, update, destroy};