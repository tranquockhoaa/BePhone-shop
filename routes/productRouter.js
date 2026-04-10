const express = require("express");
const productController = require("../controllers/productController");
const router = express.Router();

router.get("/", productController.getAllProducts);
router.get("/latest", productController.getLastestProducts);
router.get("/:id", productController.getProductById);
router.get("/getInfoDetail", productController.getInfoDetailByCodeName);
router.get("/search", productController.getProductByBrand);
router.get("/recommend/:productId", productController.recommendProducts);

module.exports = router;
