//CREATE
function createVariant(req,res,next){
    res.status(201).json({
        message: "Variant created",
        data: {
            id: 3,
            product_id: req.body.product_id || 101,
            sku: req.body.sku || "STRIDE-RUN-27",
            price: req.body.price || 1499.99,
            size: req.body.size || "27 MX",
            color: req.body.color || "Negro",
            active: true
        }
    });
}
//GET
function getVariant(req,res,next){
    res.status(200).json({
        message: "Get Variant",
        data: [
            {
            id: 1,
            product_id: 101,
            sku: "STRIDE-RUN-26",
            price: 1299.99,
            size: "26 MX",
            color: "Negro/Rojo",
            active: true
            },
            {
            id: 2,
            product_id: 101,
            sku: "STRIDE-RUN-27",
            price: 1499.99,
            size: "27 MX",
            color: "Blanco",
            active: true 
            }
        ]
    });
}

function getVariantById(req,res,next){
    res.status(200).json({
        message: "Get Variant by Id",
        data: {
            id: Number(req.params.id),
            product_id: 101,
            sku: "STRIDE-RUN-26",
            price: 1299.99,
            size: "26 MX",
            color: "Negro/Rojo",
            active: true
        }
    });
}
//UPDATED
function putVariant(req,res,next){
    res.status(200).json({
        message: "Variant updated",
        data: {
            id: Number(req.params.id),
            product_id: 101,
            sku: req.body.sku || "STRIDE-RUN-26-UPDATED",
            price: 1199.99,
            size: "26 MX",
            color: "Negro/Rojo",
            active: true 
        }
    });
}
//DELEATED
function destroyVariant(req,res,next){
    res.status(200).json({
        message: "Variant deleted",
        data: {
            id: Number(req.params.id)
        }
    });
}

module.exports = {createVariant, getVariant, getVariantById, putVariant, destroyVariant}