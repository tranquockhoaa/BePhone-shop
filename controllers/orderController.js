const orderService = require("../service/orderService");
const Order = require("../models/orders");
const OrderItem = require("../models/orderItem");
const ProductDetail = require("../models/productDetails");
const Product = require("../models/product");
const Memory = require("../models/memory");
const Color = require("../models/color");



const catchAsync = require("../utils/catchAsync");
const sequelize = require("./../config/database");
const { sendPaymentSuccessEmail } = require("../service/emailService");

const {
  VNPay,
  ignoreLogger,
  ProductCode,
  VnpLocale,
  dateFormat,
} = require("vnpay");
const { User } = require("../models");

function generateRandomTxnRef(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const formatVNDate = (vnpPayDate) => {
  // Chuỗi vnp_PayDate có định dạng: "yyyyMMddHHmmss"
  const year = vnpPayDate.substring(0, 4);
  const month = vnpPayDate.substring(4, 6);
  const day = vnpPayDate.substring(6, 8);
  const hour = vnpPayDate.substring(8, 10);
  const minute = vnpPayDate.substring(10, 12);
  const second = vnpPayDate.substring(12, 14);

  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

const formatCurrencyVND = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

exports.createPayment = async (req, res) => {
  try {
    const t = await sequelize.transaction();
    const {
      products,
      full_name,
      phone_number,
      address,
      total_amount,
      payment_method,
    } = req.body;
    const user = req.user;
    const txn = generateRandomTxnRef();

    if (!full_name || !phone_number || !address || !total_amount) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu thông tin thanh toán",
      });
    }

    const newOrder = await Order.create(
      {
        code: txn,
        full_name,
        phone_number,
        email: user.email,
        address,
        total_amount,
        payment_method,
        user_id: user.user_id,
        status: "PENDING",
      },
      { transaction: t }
    );

    for (const item of products) {
      await OrderItem.create(
        {
          order_id: newOrder.order_id,
          product_detail_id: item.product_detail_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity,
        },
        { transaction: t }
      );
    }

    await t.commit();

    if (payment_method === "VNPAY") {
      const vnpay = new VNPay({
        tmnCode: process.env.TMN_CODE,
        secureSecret: process.env.SECURE_SECRET,
        vnpayHost: "https://sandbox.vnpayment.vn",
        testMode: true,
        hashAlgorithm: "SHA512",
        loggerFn: ignoreLogger,
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const vnpayResponse = await vnpay.buildPaymentUrl({
        vnp_Amount: total_amount,
        vnp_IpAddr: "127.0.0.1",
        vnp_TxnRef: txn,
        vnp_OrderInfo: `Thanh toán đơn hàng ${txn}`,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: "http://localhost:5173/payment/success",
        vnp_CreateDate: dateFormat(new Date()),
        vnp_ExpireDate: dateFormat(tomorrow),
      });
      return res.status(200).json(vnpayResponse);
    } else {
      await sendPaymentSuccessEmail(user.email, {
        title: "Đặt hàng thành công",
        message: "Cảm ơn bạn đã đặt hàng! Đơn hàng  của bạn đang được xử lý",
        customerName: full_name,
        code: txn,
        amount: formatCurrencyVND(total_amount),
        paymentDate: new Date().toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour12: false,
          timeZone: "Asia/Ho_Chi_Minh",
        }),
      });
      return res.status(200).json({
        status: "success",
        message: "Đặt đơn thàng thành công",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi khi tạo URL thanh toán",
      error: error.message,
    });
  }
};

exports.checkPayment = async (req, res) => {
  try {
    const vnpay = new VNPay({
      tmnCode: "2BXC2ONJ",
      secureSecret: "1D2V0ZMGB3SFFGHBC2DWI065E1W1POIV",
      vnpayHost: "htttps://sandbox.vnpayment.vn",
      testMode: true,
      hashAlgorithm: "SHA512",
      loggerFn: ignoreLogger,
    });

    const isValid = vnpay.verifyReturnUrl(req.query);
    if (!isValid) {
      return res.status(400).json({
        status: "fail",
        message: "Chữ ký không hợp lệ (Invalid signature)",
      });
    }

    const responseCode = req.query.vnp_ResponseCode;
    const transactionStatus = req.query.vnp_TransactionStatus;
    const txnRef = req.query.vnp_TxnRef;
    const payDate = req.query.vnp_PayDate;
    const formattedPayDate = formatVNDate(payDate);

    const order = await Order.findOne({
      where: { code: txnRef },
    });
    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Đơn hàng không tồn tại",
      });
    }

    if (responseCode === "00" && transactionStatus === "00") {
      if (order.status !== "CONFIRMED") {
        order.status = "CONFIRMED";
        order.updatedAt = new Date();
        await order.save();
        console.log("Đã cập nhật trạng thái đơn hàng thành CONFIRMED");
      } else {
        console.log("Đơn hàng đã được xác nhận từ trước, không cập nhật lại.");
      }

      const user = await User.findByPk(order.user_id);
      if (!user) {
        return res.status(404).json({
          status: "fail",
          message: "user không tồn tại",
        });
      }

      await sendPaymentSuccessEmail(user.email, {
        customerName: order.full_name,
        code: order.code,
        amount: formatCurrencyVND(order.total_amount),
        paymentDate: formattedPayDate,
      });
      return res.status(200).json({
        status: "success",
        message: "Giao dịch thành công",
        data: req.query,
      });
    } else if (transactionStatus === "24") {
      order.status = "CANCELLED";
      await order.save();

      return res.status(200).json({
        status: "cancelled",
        message: "Khách hàng đã hủy giao dịch",
        responseCode,
        transactionStatus,
      });
    } else {
      order.status = "CANCELLED";
      await order.save();
      return res.status(200).json({
        status: "failed",
        message: "Giao dịch thất bại",
        responseCode,
        transactionStatus,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi khi kiểm tra thanh toán",
      error: error.message,
    });
  }
};

exports.getAllOrder = catchAsync(async (req, res, next) => {
  try {
    const user = req.user;
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

    const whereConditions = {
      user_id: user.user_id,
    };

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
        {
          model: OrderItem,
          as: "order_items",
          include: [
            {
              model: ProductDetail,
              as: "product_details",
              include: [
                {
                  model: Product,
                  as: "product",
                },
                {
                  model: Memory,
                  as: "memory",
                },
                 {
                  model: Color,
                  as: "color",
                },
              ],
            },
          ],
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

exports.getOrderDetails = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const orderData = await Order.findOne({
      where: { order_id: id, user_id: user.user_id },
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
               include: [
                {
                  model: Product,
                  as: "product",
                },
                {
                  model: Memory,
                  as: "memory",
                },
                 {
                  model: Color,
                  as: "color",
                },
              ],
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
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;

    const order = await Order.findOne({
      where: { order_id: id, user_id: user.user_id },
    });

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
