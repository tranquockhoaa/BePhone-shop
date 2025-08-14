const catchAsync = require('../utils/catchAsync');
const Order = require('../models/orders');
const OrderItem = require('../models/orderItem');
const { Op } = require('sequelize');

// 1. Xem danh sách đơn hàng
exports.getOrdersList = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, status, name } = req.query;

  const whereConditions = {};
  if (status) whereConditions.status = status;
  if (name) whereConditions.full_name = { [Op.like]: `%${name}%` };

  const { count, rows } = await Order.findAndCountAll({
    where: whereConditions,
    limit: +limit,
    offset: (+page - 1) * +limit,
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({
    status: 'success',
    total: count,
    data: rows,
  });
});

// 2. Xem chi tiết đơn hàng
exports.getOrderDetails = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findOne({
    where: { order_id: orderId },
    include: [
      {
        model: OrderItem,
        include: [
          {
            model: require('../models/productDetails'),
            include: [
              require('../models/color'),
              require('../models/memory'),
              {
                model: require('../models/product'),
                include: [require('../models/brand')]
              }
            ]
          }
        ]
      }
    ],
  });

  if (!order) {
    return res.status(404).json({ status: 'fail', message: 'Order not found' });
  }

  // Map thêm các trường cần thiết cho từng order item
  const orderData = order.toJSON();
  orderData.order_items = orderData.order_items.map(item => {
    const pd = item.product_detail;
    return {
      ...item,
      productName: pd?.product?.name,
      ram: pd?.memory?.ram_size,
      storage: pd?.memory?.storage_size,
      price: item.price,
      quantity: item.quantity
    };
  });

  res.status(200).json({
    status: 'success',
    data: orderData,
  });
});

// 3. Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid status' });
  }

  const order = await Order.findOne({ where: { order_id: orderId } });

  if (!order) {
    return res.status(404).json({ status: 'fail', message: 'Order not found' });
  }

  order.status = status;
  await order.save();

  res.status(200).json({
    status: 'success',
    message: `Order status updated to ${status}`,
  });
});

// 4. Tìm kiếm và lọc đơn hàng
exports.searchOrders = catchAsync(async (req, res, next) => {
  const { searchTerm, status } = req.query;

  const whereConditions = {
    [Op.or]: [
      { full_name: { [Op.like]: `%${searchTerm || ''}%` } },
      { phone_number: { [Op.like]: `%${searchTerm || ''}%` } },
      { email: { [Op.like]: `%${searchTerm || ''}%` } },
    ],
  };
  if (status) whereConditions.status = status;

  const orders = await Order.findAll({
    where: whereConditions,
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({
    status: 'success',
    data: orders,
  });
});

// 5. Xóa đơn hàng
exports.deleteOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findOne({ where: { order_id: orderId } });

  if (!order) {
    return res.status(404).json({ status: 'fail', message: 'Order not found' });
  }

  await order.destroy();

  res.status(200).json({
    status: 'success',
    message: 'Order deleted successfully',
  });
});
