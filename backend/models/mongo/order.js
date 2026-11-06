const mongoose = require('mongoose');

const nonNegativeAmount = {
    validator: function (value) {
        if (value == null) return true;

        const decimal = value.toString();

        return /^(?:\d+(?:\.\d+)?|-0(?:\.0+)?)(?:e[+-]?\d+)?$/i.test(decimal);
    },
    message: 'Amount must be a finite non-negative decimal'
};
const orderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    salesPersonId: { type: Number, min: 1, validate: Number.isInteger },
    paymentMethod: { type: String, enum: ['CARD', 'CASH', 'TRANSFER'], trim: true },
    totals: {
        subtotal: { type: mongoose.Schema.Types.Decimal128, required: true, validate: nonNegativeAmount },
        shipping: { type: mongoose.Schema.Types.Decimal128, default: '0', validate: nonNegativeAmount },
        discount: { type: mongoose.Schema.Types.Decimal128, default: '0', validate: nonNegativeAmount },
        total: { type: mongoose.Schema.Types.Decimal128, required: true, validate: nonNegativeAmount }
    },
    shippingAddress: {
        street: { type: String, trim: true },
        number: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        country: { type: String, trim: true }
    },
    items: {
        type: [{
            productId: { type: Number, required: true, min: 1, validate: Number.isInteger },
            quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
            unitPrice: { type: mongoose.Schema.Types.Decimal128, required: true, validate: nonNegativeAmount }
        }],
        validate: {
            validator: function (items) {
                return Array.isArray(items) && items.length > 0;
            },
            message: 'An order must contain at least one item'
        }
    },
    statusHistory: [{
        status: { type: String, required: true, enum: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'], trim: true },
        changedById: { type: Number, required: true, min: 1, validate: Number.isInteger },
        changedAt: { type: Date, default: Date.now },
        note: { type: String, trim: true }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
