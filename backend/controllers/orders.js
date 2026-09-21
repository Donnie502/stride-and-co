// controllers/orders.js
// Controlador con datos mock para el recurso "orders".

let orders = [
  {
    _id: "o001",
    customerId: "c001",
    salesPersonId: 3,
    paymentMethod: "card",
    totals: {
      subtotal: 1200.0,
      shipping: 100.0,
      discount: 0.0,
      total: 1300.0,
    },
    shippingAddress: {
      street: "Av. Universidad",
      number: "1234",
      city: "Chihuahua",
      state: "Chihuahua",
      postalCode: "31000",
      country: "México",
    },
    items: [
      {
        productId: 10,
        quantity: 2,
        unitPrice: 600.0,
      },
    ],
    statusHistory: [
      {
        status: "pending",
        changedById: 3,
        changedAt: "2026-09-01T12:00:00Z",
        note: "Orden creada",
      },
    ],
    createdAt: "2026-09-01T12:00:00Z",
    updatedAt: "2026-09-01T12:00:00Z",
  },
];

// GET 
exports.getAllOrders = (req, res) => {
  res.status(200).json({
    message: "GET orders",
    data: orders,
  });
};

// GET
exports.getOrderById = (req, res) => {
  const order = orders.find((o) => o._id === req.params.id);

  if (!order) {
    return res.status(404).json({
      message: `Order with id ${req.params.id} not found`,
    });
  }

  res.status(200).json({
    message: `GET order ${req.params.id}`,
    data: order,
  });
};

// POST /api/orders
exports.createOrder = (req, res) => {
  const body = req.body || {};

  if (!body.customerId || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({
      message: "Fields 'customerId' and a non-empty 'items' array are required",
    });
  }

  const newOrder = {
    _id: `o${String(orders.length + 1).padStart(3, "0")}`,
    customerId: body.customerId,
    salesPersonId: body.salesPersonId || null,
    paymentMethod: body.paymentMethod || "cash",
    totals: body.totals || { subtotal: 0, shipping: 0, discount: 0, total: 0 },
    shippingAddress: body.shippingAddress || {},
    items: body.items,
    statusHistory: [
      {
        status: "pending",
        changedById: body.salesPersonId || null,
        changedAt: new Date().toISOString(),
        note: "Orden creada",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.push(newOrder);

  res.status(201).json({
    message: "Order created",
    data: newOrder,
  });
};

// PUT 
exports.updateOrder = (req, res) => {
  const index = orders.findIndex((o) => o._id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      message: `Order with id ${req.params.id} not found`,
    });
  }

  orders[index] = {
    ...orders[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  res.status(200).json({
    message: `Order ${req.params.id} updated`,
    data: orders[index],
  });
};

// PATCH 
// Endpoint extra para agregar una entrada al historial de estados (statusHistory).
exports.updateOrderStatus = (req, res) => {
  const index = orders.findIndex((o) => o._id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      message: `Order with id ${req.params.id} not found`,
    });
  }

  const { status, changedById, note } = req.body || {};

  if (!status) {
    return res.status(400).json({
      message: "Field 'status' is required",
    });
  }

  orders[index].statusHistory.push({
    status,
    changedById: changedById || null,
    changedAt: new Date().toISOString(),
    note: note || "",
  });
  orders[index].updatedAt = new Date().toISOString();

  res.status(200).json({
    message: `Status added to order ${req.params.id}`,
    data: orders[index],
  });
};

// DELETE
exports.deleteOrder = (req, res) => {
  const index = orders.findIndex((o) => o._id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      message: `Order with id ${req.params.id} not found`,
    });
  }

  const deleted = orders.splice(index, 1)[0];

  res.status(200).json({
    message: `Order ${req.params.id} deleted`,
    data: deleted,
  });
};