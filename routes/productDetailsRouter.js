const express = require('express');
const productDetailsController = require('../controllers/productDetailController');
const router = express.Router();

router.get('/', productDetailsController.getAllProductDetail);
router.get('/:id', productDetailsController.getProductDetailById);

module.exports = router;
