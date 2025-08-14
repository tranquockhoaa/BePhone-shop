const Order = require('../models/orders');
const OrderItem = require('../models/orderItem');
const User = require('../models/user');
const ProductDetail = require('../models/productDetails');
const Product = require('../models/product');
const Color = require('../models/color');
const Memory = require('../models/memory');
const Brand = require('../models/brand');
const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');

// Lấy danh sách đơn hàng (có phân trang)
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const { count, rows } = await Order.findAndCountAll({
    order: [['createdAt', 'DESC']],
    offset: Number(offset),
    limit: Number(limit),
    include: [
      { model: User, attributes: ['name', 'phone', 'address'] }
    ]
  });
  res.status(200).json({ status: 'success', total: count, orders: rows });
});

// Xem chi tiết một đơn hàng
exports.getOrderDetail = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const order = await Order.findByPk(id, {
    include: [
      { model: User, attributes: ['name', 'phone', 'address'] },
      {
        model: OrderItem,
        include: [
          {
            model: ProductDetail,
            include: [
              { model: Product, attributes: ['name'], include: [{ model: Brand, attributes: ['name'] }] },
              { model: Color, attributes: ['name'] },
              { model: Memory, attributes: ['ram_size', 'storage_size'] }
            ]
          }
        ]
      }
    ]
  });
  if (!order) {
    return res.status(404).json({ status: 'error', message: 'Order not found' });
  }
  res.status(200).json({ status: 'success', order });
});

// Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = await Order.findByPk(id);
  if (!order) {
    return res.status(404).json({ status: 'error', message: 'Order not found' });
  }
  await order.update({ status });
  res.status(200).json({ status: 'success', data: order });
});

// Xóa đơn hàng
exports.deleteOrder = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const order = await Order.findByPk(id);
  if (!order) {
    return res.status(404).json({ status: 'error', message: 'Order not found' });
  }
  await OrderItem.destroy({ where: { order_id: id } });
  await order.destroy();
  res.status(204).json({ status: 'success', data: null });
});