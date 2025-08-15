const Product = require('../models/product');
const Order = require('../models/orders');
const User = require('../models/user');
const ProductDetail = require('../models/productDetails');
const Color = require('../models/color');
const Memory = require('../models/memory');
const Brand = require('../models/brand');


const { Op, fn, col, literal } = require('sequelize');
const catchAsync = require('../utils/catchAsync');

// GET /api/v1/admin/products
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, name = "", code ="" } = req.query;
  const offset = (page - 1) * limit;
  const { count, rows } = await Product.findAndCountAll({
    order: [['createdAt', 'DESC']],
    offset: Number(offset),
    limit: Number(limit),
    name: name,
    code: code,
  });
  res.status(200).json({ status: 'success', total: count, products: rows });
});

// GET /api/v1/admin/orders
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const { count, rows } = await Order.findAndCountAll({
    order: [['createdAt', 'DESC']],
    offset: Number(offset),
    limit: Number(limit)
  });
  res.status(200).json({ status: 'success', total: count, orders: rows });
});



// GET /api/v1/admin/users
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const { count, rows } = await User.findAndCountAll({
    order: [['createdAt', 'DESC']],
    offset: Number(offset),
    limit: Number(limit)
  });
  res.status(200).json({ status: 'success', total: count, users: rows });
});

// GET /api/v1/admin/orders/total-revenue
exports.getTotalRevenue = catchAsync(async (req, res, next) => {
  const result = await Order.findOne({
    attributes: [[fn('SUM', col('total_amount')), 'totalRevenue']],
    where: { status: 'DELIVERED' } // Sửa lại chỉ còn 'DELIVERED'
  });
  res.status(200).json({ status: 'success', totalRevenue: result.get('totalRevenue') || 0 });
});

// GET /api/v1/admin/orders/revenue-by-month
exports.getRevenueByMonth = catchAsync(async (req, res, next) => {
  const result = await Order.findAll({
    attributes: [
      [fn('DATE_TRUNC', 'month', col('createdAt')), 'month'],
      [fn('SUM', col('total_amount')), 'revenue']
    ],
    where: { status: 'DELIVERED' }, // Sửa lại chỉ còn 'DELIVERED'
    group: [literal('month')],
    order: [[literal('month'), 'DESC']]
  });
  res.status(200).json({ status: 'success', revenueByMonth: result });
});

// GET /api/v1/admin/orders/count-by-month
exports.getOrderCountByMonth = catchAsync(async (req, res, next) => {
  const result = await Order.findAll({
    attributes: [
      [fn('DATE_TRUNC', 'month', col('createdAt')), 'month'],
      [fn('COUNT', '*'), 'orderCount']
    ],
    group: [literal('month')],
    order: [[literal('month'), 'DESC']]
  });
  res.status(200).json({ status: 'success', orderCountByMonth: result });
});

// GET /api/v1/admin/products/top-selling
exports.getTopSellingProducts = catchAsync(async (req, res, next) => {
  const result = await Order.sequelize.query(`
    SELECT p.product_id, p.name, SUM(oi.quantity) as totalSold
    FROM order_items oi
    JOIN product_details pd ON oi.product_detail_id = pd.product_detail_id
    JOIN products p ON pd.product_id = p.product_id
    JOIN orders o ON oi.order_id = o.order_id
    WHERE o.status = 'PENDING'
    GROUP BY p.product_id, p.name
    ORDER BY totalSold DESC
    LIMIT 5
  `, { type: Order.sequelize.QueryTypes.SELECT });
  res.status(200).json({ status: 'success', topSelling: result });
});

// GET /api/v1/admin/products/low-stock
exports.getLowStockProducts = catchAsync(async (req, res, next) => {
  const result = await ProductDetail.findAll({
    attributes: ['product_detail_id', 'quantity'],
    where: { quantity: { [Op.lte]: 10 } },
    include: [
      {
        model: Product,
        attributes: ['code', 'name'] // Lấy đúng tên sản phẩm từ bảng products
      }
    ],
    order: [['quantity', 'ASC']],
    limit: 10
  });
  res.status(200).json({ status: 'success', lowStock: result });
});
// GET /api/v1/admin/overview
exports.getOverview = async (req, res, next) => {
  // Tổng số sản phẩm đang bán
  const totalProducts = await Product.count();

  // Số đơn hàng hôm nay
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ordersToday = await Order.count({
    where: {
      createdAt: { [Op.gte]: today }
    }
  });

  // Số đơn hàng tuần này
  const weekStart = new Date();
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const ordersThisWeek = await Order.count({
    where: {
      createdAt: { [Op.gte]: weekStart }
    }
  });

  // Số đơn hàng tháng này
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const ordersThisMonth = await Order.count({
    where: {
      createdAt: { [Op.gte]: monthStart }
    }
  });

  // Tổng doanh thu (đơn đã giao)
  const totalRevenue = await Order.sum('total_amount', { where: { status: 'DELIVERED' } }) || 0;

  // Số lượng người dùng
  const totalUsers = await User.count();

  res.status(200).json({
    status: 'success',
    data: {
      totalProducts,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      totalRevenue,
      totalUsers
    }
  });
};

exports.getAllProductDetails = catchAsync(async (req, res, next) => {


  const details = await ProductDetail.findAll({
    attributes: [
      'product_detail_id',
      'price',
      'quantity',
      'discount',
      'createdAt'
    ],
    include: [
      {
        model: Product,
        attributes: ['code', 'name'],
        include: [
          {
            model: Brand,
            attributes: ['name']
          }
        ]
      },
      {
        model: Color,
        attributes: ['name']
      },
      {
        model: Memory,
        attributes: ['ram_size', 'storage_size'] // Lấy cả RAM và bộ nhớ trong
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({ status: 'success', total: details.length, productDetails: details });
});

exports.getAllProductsWithTotalQuantity = catchAsync(async (req, res, next) => {
  const Brand = require('../models/brand');
  const products = await Product.findAll({
    attributes: [
      'product_id',
      'code',
      'name',
      'description',
      [fn('COALESCE', fn('SUM', col('product_details.quantity')), 0), 'totalQuantity'],
      'createdAt' // Thêm dòng này để lấy ngày nhập
    ],
    include: [
      {
        model: ProductDetail,
        attributes: []
      },
      {
        model: Brand,
        attributes: ['name'] // Lấy tên thương hiệu
      }
    ],
    group: ['products.product_id', 'brand.brand_id', 'brand.name'],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({ status: 'success', total: products.length, products });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findByPk(id);
  if (!product) {
    return res.status(404).json({ status: 'error', message: 'Product not found' });
  }

  // Xóa tất cả product_details liên quan
  await ProductDetail.destroy({ where: { product_id: id } });

  // Xóa sản phẩm
  await product.destroy();

  res.status(204).json({ status: 'success', data: null });
});

exports.updateProductName = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  const product = await Product.findByPk(id);
  if (!product) {
    return res.status(404).json({ status: 'error', message: 'Product not found' });
  }
  await product.update({ name });
  res.status(200).json({ status: 'success', data: product });
});

exports.deleteProductDetail = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const productDetail = await ProductDetail.findByPk(id);
  if (!productDetail) {
    return res.status(404).json({ status: 'error', message: 'Product detail not found' });
  }
  await productDetail.destroy();
  res.status(204).json({ status: 'success', data: null });
});

exports.updateProductDetail = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let { colorName, ramSize, storageSize, price, quantity } = req.body;

  // Tìm product detail theo id
  const productDetail = await ProductDetail.findByPk(id, {
    include: [Color, Memory]
  });
  if (!productDetail) {
    return res.status(404).json({ status: 'error', message: 'Product detail not found' });
  }

  // Nếu không truyền thì lấy giá trị cũ
  colorName = colorName || productDetail.color?.name;
  ramSize = ramSize || productDetail.memory?.ram_size;
  storageSize = storageSize || productDetail.memory?.storage_size;
  price = price !== undefined ? price : productDetail.price;
  quantity = quantity !== undefined ? quantity : productDetail.quantity;

  // Tìm hoặc tạo mới màu
  const [color] = await Color.findOrCreate({ where: { name: colorName } });

  // Tìm hoặc tạo mới bộ nhớ (RAM + Storage)
  const [memory] = await Memory.findOrCreate({
    where: { ram_size: ramSize, storage_size: storageSize }
  });

  // Kiểm tra trùng lặp (trừ chính bản ghi đang sửa)
  const existed = await ProductDetail.findOne({
    where: {
      product_id: productDetail.product_id,
      color_id: color.color_id,
      memory_id: memory.memory_id,
      product_detail_id: { [Op.ne]: id }
    }
  });
  if (existed) {
    return res.status(400).json({ status: 'error', message: 'Đã tồn tại biến thể với thông tin này!' });
  }

  // Cập nhật thông tin
  await productDetail.update({
    color_id: color.color_id,
    memory_id: memory.memory_id,
    price,
    quantity
  });

  res.status(200).json({ status: 'success', data: productDetail });
});