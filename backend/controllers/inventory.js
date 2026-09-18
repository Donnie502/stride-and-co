//Create
function createInventory(req,res,next ){
    res.status(201).json({
        message: "Inventory Created",
        data: {
            variant_id: req.body.variant_id || 3,
            stock: req.body.stock || 100,
            reserved: req.body.reserved || 0,
            updated_at: new Date()
        }
    });
}
//READ
function getInventory(req, res, next){
    res.status(200).json({
        message: "Inventory list",
        data: [
            {variant_id: 1,
            stock: 50,
            reserved: 5,
            updated_at: "2026-09-01 10:00:00"
            },
            {
                variant_id: 2,
                stock: 30,
                reserved: 0,
                updated_at: "2026-09-02 14:30:00"
            }
        ]
    });
}
function getInventoryById(req,res,next){
    res.status(200).json({
        message: "Inventory by Id",
        data: {
            variant_id: Number(req.params.id),
            stock: 50,
            reserved:5,
            updated_at: "2026-09-01 10:00:00"
        }
    });
}
//UPDATE    
function putInventory(req,res,next){
    res.status(200).json({
        message: "Inventory Updated",
        data: {
            variant_id: Number(req.params.id),
            stock: req.body.stock || 45,
            reserved: req.body.reserved || 2,
            updated_at: new Date()
        }
    });
}

//DELETE
function destroyInventory(req,res,next){
    res.status(200).json({
        message: "Inventory deleted",
        data: {
            variant_id: Number(req.params.id)
        }
    });
} 
module.exports = {createInventory, getInventory ,getInventoryById, putInventory, destroyInventory}