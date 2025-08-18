const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const orderAdminController = require('../controllers/orderAdminController');
router.use(authController.protect, authController.restrictTo('admin'));


router.get('/', orderAdminController.getOrdersList);

router.get('/:orderId', orderAdminController.getOrderDetails);

router.put('/:orderId', orderAdminController.updateOrder);

router.delete('/:orderId', orderAdminController.deleteOrder);

module.exports = router;
