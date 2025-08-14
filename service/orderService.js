const Cart = require('../models/cart');
const CartDetail = require('../models/cartDetail');
const Order = require('../models/orders');
const OrderItem = require('../models/orderItem');
const sequelize = require('../config/database');

const orderService = {
  async createOrderFromCart(userId, orderInfo) {
    // 1. Lấy cart ACTIVE của user
    const cart = await Cart.findOne({
  where: { user_id: userId, status: 'INACTIVE' },
  order: [['cart_id', 'DESC']]
});
    if (!cart) throw new Error('Không tìm thấy giỏ hàng');
    // 2. Lấy chi tiết sản phẩm trong cart
    const cartDetails = await CartDetail.findAll({ where: { cart_id: cart.cart_id } });
    if (!cartDetails.length) throw new Error('Giỏ hàng trống');
    // 3. Tính tổng tiền
    const total_price = cartDetails.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    // 4. Tạo order và orderItems trong transaction
    return await sequelize.transaction(async (t) => {
      const order = await Order.create({
      user_id: userId,
      full_name: orderInfo.full_name,
      phone_number: orderInfo.phone_number,
      email: orderInfo.email, // thêm dòng này
      address: orderInfo.address,
      note: orderInfo.note,
      total_amount: total_price, // đổi tên trường này
      status: 'PENDING'
      }, { transaction: t });

      const orderItems = [];
      for (const item of cartDetails) {
      const orderItem = await OrderItem.create({
        order_id: order.order_id,
        product_detail_id: item.product_detail_id, // đúng tên trường
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity // thêm dòng này
      }, { transaction: t });
      orderItems.push(orderItem);
    }
      await cart.update({ status: 'ORDERED' }, { transaction: t });
      return { order, orderItems };
    });
  }
};

module.exports = orderService;