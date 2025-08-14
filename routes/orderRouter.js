const express = require('express');
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/checkout', authController.protect, orderController.createOrder);

router.get('/', authController.protect, authController.restrictTo('admin'), orderController.getAllOrders);
router.get('/:id', authController.protect, authController.restrictTo('admin'), orderController.getOrderById);
router.patch('/:id', authController.protect, authController.restrictTo('admin'), orderController.updateOrderStatus);

module.exports = router;