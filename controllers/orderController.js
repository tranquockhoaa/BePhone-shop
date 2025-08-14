const orderService = require('../service/orderService');
const Order = require('../models/orders');
const OrderItem = require('../models/orderItem');
const catchAsync = require('../utils/catchAsync');

exports.createOrder = catchAsync(async (req, res, next) => {
  const userId = req.userId; // Lấy từ middleware xác thực
  const { name, phone, email, note, address } = req.body;
  if (!name || !phone || !address) {
    return res.status(400).json({ status: 'fail', message: 'Thiếu thông tin đặt hàng!' });
  }
  const { order, orderItems } = await orderService.createOrderFromCart(userId, {
    full_name: name,
    phone_number: phone,
    email,
    address,
    note,
  });
  res.status(200).json({ status: 'success', order, orderItems });
});

// Lấy tất cả đơn hàng (admin)
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
  res.status(200).json({ status: 'success', data: orders });
});

// Lấy chi tiết đơn hàng (admin)
exports.getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id, {
    include: [{ model: OrderItem }]
  });
  if (!order) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
  res.status(200).json({ status: 'success', data: order });
});

// Cập nhật trạng thái đơn hàng (admin)
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng' });
  order.status = req.body.status;
  await order.save();
  res.status(200).json({ status: 'success', data: order });
});