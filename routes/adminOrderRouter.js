const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const orderAdminController = require('../controllers/orderAdminController');
router.use(authController.protect, authController.restrictTo('admin'));


// 1. Route để xem danh sách đơn hàng
router.get('/', orderAdminController.getOrdersList);
router.get('/search', orderAdminController.searchOrders);

// 2. Route để xem chi tiết đơn hàng
router.get('/:orderId', orderAdminController.getOrderDetails);

// 3. Route để cập nhật trạng thái đơn hàng
router.put('/:orderId/status', orderAdminController.updateOrderStatus);

// 4. Route để tìm kiếm và lọc đơn hàng

// 5. Route để xóa đơn hàng
router.delete('/:orderId', orderAdminController.deleteOrder);

module.exports = router;
