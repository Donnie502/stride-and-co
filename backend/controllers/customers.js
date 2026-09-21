// Controller with mock data for customers

let customers = [
    {
        _id: "c001",
        userId: 1,
        phone: "614-123-4567",
        email: "juan.perez@example.com",
        address: [{
            type: "shipping",
            street: "Av. Universidad",
            number: "123",
            city: "Chihuahua",
            state: "Chihuahua",
            postalCode: "31000",
            country: "Mexico"
        },
    ],
    createdAt: "2026-01-15T10:30:00Z",
    updatedAt: "2026-01-20T14:45:00Z"
    },
    {
        _id: "c002",
        userId: 2,
        phone: "614-987-6543",
        email: "maria.gonzalez@example.com",
        address: [{
            type: "billing",
            street: "Calle Principal",
            number: "456",
            city: "Guadalajara",
            state: "Jalisco",
            postalCode: "44100",
            country: "Mexico"
        }
    ],
        createdAt: "2026-01-18T09:15:00Z",
        updatedAt: "2026-01-22T16:30:00Z"
    },
];

// GET
exports.getAllCustomers = (req, res) => {
    res.status(200).json({
        message: "Get all customers",
        data: customers
    });
}

// GET 
exports.getCustomerById = (req, res) => {
    const customer = customers.find(c => c._id === req.params.id);
    if (!customer) {
        return res.status(404).json({
            message: `Customer with id ${req.params.id} not found`,
            data: customer
        });
    }

    res.status(200).json({
        message: `Get customer ${req.params.id}`,
        data: customer,
    });
}

// POST
exports.createCustomer = (req, res) => {
    const body = req.body || {};

    if (!body.email || !body.phone) {
        return res.status(400).json({
            message: 'Missing required fields: email and phone',
            data: null
        });
    }

    const newCustomer = {
        _id: `c00${customers.length + 1}`,
        userId: body.userId || null,
        phone: body.phone || "",
        email: body.email,
        address: body.address || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    customers.push(newCustomer);

    res.status(201).json({
        message: "Customer created",
        data: newCustomer
    });

}

// PUT
exports.updateCustomer = (req, res) => {
    const index = customers.findIndex(c => c._id === req.params.id);

    if (index === -1) {
        return res.status(404).json({
            message: "Customer with id ${req.params.id} not found",
        });
    }

    customers[index] = {
        ...customers[index],
        ...req.body,
        updatedAt: new Date().toISOString()
    };

    res.status(200).json({
        message: "Customer ${req.params.id} updated",
        data: customers[index]
    });
};

// DELETE
exports.deleteCustomer = (req, res) => {
    const index = customers.findIndex(c => c._id === req.params.id);

    if (index === -1) {
        return res.status(404).json({
            message: "Customer with id ${req.params.id} not found"
        });
    }

    const deleted = customers.splice(index, 1)[0];

    res.status(200).json({
        message: "Customer ${req.params.id} deleted",
        data: deleted
    });
};
