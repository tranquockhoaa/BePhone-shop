// const Product = require('../models/product');
// const Order = require('../models/orders');
// const User = require('../models/user');
// const { Op, fn, col, literal } = require('sequelize');

// const orderService = {
//   async getAllOrders(page = 1, limit = 20) {
//     const offset = (page - 1) * limit;
//     return await Order.findAndCountAll({
//       order: [['createdAt', 'DESC']],
//       offset: Number(offset),
//       limit: Number(limit)
//     });
//   },
// async getTotalRevenue() {
//   return await Order.findOne({
//     attributes: [[fn('SUM', col('total_amount')), 'totalRevenue']],
//     where: { status: { [Op.in]: ['COMPLETED', 'SUCCESS', 'DELIVERED'] } }
//   });
// },
// async getRevenueByMonth() {
//   return await Order.findAll({
//     attributes: [
//       [fn('DATE_TRUNC', 'month', col('createdAt')), 'month'],
//       [fn('SUM', col('total_amount')), 'revenue']
//     ],
//     where: { status: { [Op.in]: ['COMPLETED', 'SUCCESS', 'DELIVERED'] } },
//     group: [literal('month')],
//     order: [[literal('month'), 'DESC']]
//   });
// },
//   async getOrderCountByMonth() {
//     return await Order.findAll({
//       attributes: [
//         [fn('DATE_TRUNC', 'month', col('createdAt')), 'month'],
//         [fn('COUNT', '*'), 'orderCount']
//       ],
//       group: [literal('month')],
//       order: [[literal('month'), 'DESC']]
//     });
//   },
//   async getTopSellingProducts() {
//     return await Order.sequelize.query(`
//       SELECT p.product_id, p.name, SUM(oi.quantity) as totalSold
//       FROM order_items oi
//       JOIN products p ON oi.product_id = p.product_id
//       JOIN orders o ON oi.order_id = o.order_id
//       WHERE o.status IN ('COMPLETED', 'SUCCESS', 'DELIVERED')
//       GROUP BY p.product_id, p.name
//       ORDER BY totalSold DESC
//       LIMIT 5
//     `, { type: Order.sequelize.QueryTypes.SELECT });
//   }
// };

// const productService = {
//   async getAllProducts(page = 1, limit = 20) {
//     const offset = (page - 1) * limit;
//     return await Product.findAndCountAll({
//       order: [['createdAt', 'DESC']],
//       offset: Number(offset),
//       limit: Number(limit)
//     });
//   },
//   async getLowStockProducts() {
//     return await Product.findAll({
//       where: { quantity: { [Op.lte]: 10 } },
//       order: [['quantity', 'ASC']],
//       limit: 10
//     });
//   }
// };

// const userService = {
//   async getAllUsers(page = 1, limit = 20) {
//     const offset = (page - 1) * limit;
//     return await User.findAndCountAll({
//       order: [['createdAt', 'DESC']],
//       offset: Number(offset),
//       limit: Number(limit)
//     });
//   }
// };

// module.exports = { orderService, productService, userService };
