const mongoose = require('mongoose');
const { Customer, Order } = require('../models/documents');

// regresa el id del usuario dueño de la orden (Order -> Customer.userId)
// authorize lo compara con req.user.id cuando el permiso es own
async function orderOwner(req) {
  // si el id no es valido no hay orden, el controller responde
  if (!mongoose.isValidObjectId(req.params.id)) return null;

  const order = await Order.findById(req.params.id);
  if (!order) return null;

  const customer = await Customer.findById(order.customerId);
  // si la orden no tiene cliente nadie es dueño (los ids empiezan en 1)
  if (!customer) return 0;

  return customer.userId;
}

module.exports = { orderOwner };
