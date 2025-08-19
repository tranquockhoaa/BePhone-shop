const catchAsync = require("../utils/catchAsync");
const Order = require("../models/orders");
const User = require("../models/user");
const OrderItem = require("../models/orderItem");
const ProductDetail = require("../models/productDetails");

const { Op } = require("sequelize");

exports.getOrdersList = catchAsync(async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,

      search,
      payment_method,
      sortBy = "createdAt",
      sortOrder = "ASC",
    } = req.query;

    const allowedSortFields = [
      "createdAt",
      "total_amount",
      "status",
      "phone_number",
      "payment_method",
    ];
    const allowedSortOrders = ["ASC", "DESC"];

    const finalSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "ASC";

    const whereConditions = {};

    if (status) whereConditions.status = status;

    if (payment_method) whereConditions.payment_method = payment_method;

    if (search) {
      whereConditions[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Order.findAndCountAll({
      include: [
        {
          model: User,
          as: "user",
        },
      ],
      where: whereConditions,
      limit: +limit,
      offset: (+page - 1) * +limit,
      order: [[finalSortBy, finalSortOrder]],
    });

    res.status(200).json({
      status: "success",
      total: count,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// 2. Xem chi tiết đơn hàng
exports.getOrderDetails = catchAsync(async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const orderData = await Order.findOne({
      where: { order_id: orderId },
      include: [
        {
          model: User,
          as: "user",
        },
        {
          model: OrderItem,
          as: "order_items",
          include: [
            {
              model: ProductDetail,
              as: "product_details",
            },
          ],
        },
      ],
    });

    if (!orderData) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: orderData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

exports.updateOrder = catchAsync(async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ where: { order_id: orderId } });

    if (!order) {
      return res
        .status(404)
        .json({ status: "fail", message: "Order not found" });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      status: "success",
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// 5. Xóa đơn hàng
exports.deleteOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findOne({ where: { order_id: orderId } });

  if (!order) {
    return res.status(404).json({ status: "fail", message: "Order not found" });
  }

  await order.destroy();

  res.status(200).json({
    status: "success",
    message: "Order deleted successfully",
  });
});
