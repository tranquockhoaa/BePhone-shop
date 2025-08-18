const orderService = require("../service/orderService");
const Order = require("../models/orders");
const OrderItem = require("../models/orderItem");
const catchAsync = require("../utils/catchAsync");
const sequelize = require("./../config/database");

const {
  VNPay,
  ignoreLogger,
  ProductCode,
  VnpLocale,
  dateFormat,
} = require("vnpay");

function generateRandomTxnRef(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
exports.createPayment = async (req, res) => {
  try {
    const t = await sequelize.transaction();
    const {
      products,
      full_name,
      phone_number,
      email,
      address,
      total_amount,
      payment_method,
    } = req.body;
    const user = req.user;
    const txn = generateRandomTxnRef();

    if (!full_name || !phone_number || !email || !address || !total_amount) {
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
        email,
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
      vnp_ReturnUrl: "http://localhost:3000/api/v1/order/check-payment-vnpay",
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    });

    return res.status(200).json(vnpayResponse);
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

    const user = req.user;
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

exports.createOrder = catchAsync(async (req, res, next) => {
  const userId = req.userId; // Lấy từ middleware xác thực
  const { name, phone, email, note, address } = req.body;
  if (!name || !phone || !address) {
    return res
      .status(400)
      .json({ status: "fail", message: "Thiếu thông tin đặt hàng!" });
  }
  const { order, orderItems } = await orderService.createOrderFromCart(userId, {
    full_name: name,
    phone_number: phone,
    email,
    address,
    note,
  });
  res.status(200).json({ status: "success", order, orderItems });
});

// Lấy tất cả đơn hàng (admin)
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.findAll({ order: [["createdAt", "DESC"]] });
  res.status(200).json({ status: "success", data: orders });
});

// Lấy chi tiết đơn hàng (admin)
exports.getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id, {
    include: [{ model: OrderItem }],
  });
  if (!order)
    return res
      .status(404)
      .json({ status: "fail", message: "Không tìm thấy đơn hàng" });
  res.status(200).json({ status: "success", data: order });
});

// Cập nhật trạng thái đơn hàng (admin)
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order)
    return res
      .status(404)
      .json({ status: "fail", message: "Không tìm thấy đơn hàng" });
  order.status = req.body.status;
  await order.save();
  res.status(200).json({ status: "success", data: order });
});
