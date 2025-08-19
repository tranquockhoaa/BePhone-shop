const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminProductDetailController = require('../controllers/adminProductDetail');

router.use(authController.protect, authController.restrictTo('admin'));

router.get('/', adminProductDetailController.getAllProductDetail)
router.post('/create', adminProductDetailController.createProductDetail)
router.get('/:id', adminProductDetailController.getProductDetailById);
router.put('/:id', adminProductDetailController.updateProductDetail);
router.delete('/:id', adminProductDetailController.deleteProductDetail);




module.exports = router;
