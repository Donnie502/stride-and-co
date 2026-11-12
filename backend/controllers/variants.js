const { ProductVariant } = require('../models/sql');

// CREATE
async function createVariant(req, res, next) {
    try {
        const { product_id, sku, size, color, active } = req.body;

        if (!product_id || typeof product_id !== 'number') {
            return res.status(400).json({ message: req.__('variants.productIdRequired') });
        }
        if (!sku || typeof sku !== 'string' || sku.trim() === '') {
            return res.status(400).json({ message: req.__('variants.skuRequired') });
        }
        if (!size || typeof size !== 'string' || size.trim() === '') {
            return res.status(400).json({ message: req.__('variants.sizeRequired') });
        }
        if (!color || typeof color !== 'string' || color.trim() === '') {
            return res.status(400).json({ message: req.__('variants.colorRequired') });
        }

        const variant = await ProductVariant.create({
            product_id,
            sku: sku.trim(),
            size: size.trim(),
            color: color.trim(),
            active
        });

        res.status(201).json({ message: req.__('variants.created'), data: variant });
    } catch (err) {
        next(err);
    }
}

//READ
async function getVariant(req, res, next) {
    try {
        const variants = await ProductVariant.findAll();
        res.status(200).json({ message: req.__('variants.list'), data: variants });
    } catch (err) {
        next(err); 
    }
}

//READ
async function getVariantById(req, res, next) {
    try {
        const id = req.params.id;
        const variant = await ProductVariant.findByPk(id);

        if (!variant) {
            return res.status(404).json({ message: req.__('variants.notFound') });
        }

        res.status(200).json({ message: req.__('variants.found'), data: variant });
    } catch (err) {
        next(err);
    }
}

// UPDATE
async function putVariant(req, res, next) {
    try {
        const id = req.params.id;
        const { sku, size, color, active } = req.body;

        const variant = await ProductVariant.findByPk(id);

        if (!variant) {
            return res.status(404).json({ message: req.__('variants.notFound') });
        }

        let changes = {};

        if (sku !== undefined) {
            if (typeof sku !== 'string' || sku.trim() === '') {
                return res.status(400).json({ message: req.__('variants.skuInvalid') });
            }
            changes.sku = sku.trim();
        }
        if (size !== undefined) {
            if (typeof size !== 'string' || size.trim() === '') {
                return res.status(400).json({ message: req.__('variants.sizeInvalid') });
            }
            changes.size = size.trim();
        }
        if (color !== undefined) {
            if (typeof color !== 'string' || color.trim() === '') {
                return res.status(400).json({ message: req.__('variants.colorInvalid') });
            }
            changes.color = color.trim();
        }
        if (active !== undefined) {
            changes.active = active;
        }

        await variant.update(changes);

        res.status(200).json({ message: req.__('variants.updated'), data: variant });
    } catch (err) {
        next(err);
    }
}

// DELETE
async function destroyVariant(req, res, next) {
    try {
        const id = req.params.id;
        const variant = await ProductVariant.findByPk(id);

        if (!variant) {
            return res.status(404).json({ message: req.__('variants.notFound') });
        }

        await variant.destroy();
        res.status(200).json({ message: req.__('variants.deleted'), data: variant });
    } catch (err) {
        next(err);
    }
}

module.exports = { createVariant, getVariant, getVariantById, putVariant, destroyVariant };