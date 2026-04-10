const Product = require("../models/product");
const Order = require("../models/orders");
const User = require("../models/user");
const ProductDetail = require("../models/productDetails");
const Color = require("../models/color");
const Memory = require("../models/memory");
const Brand = require("../models/brand");
const Media = require("../models/media");

const { Op, fn, col, literal, where, cast } = require("sequelize");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// GET /api/v1/admin/products
exports.getAllProducts = catchAsync(async (req, res, next) => {
  try {
    const {
      search,
      brand_id = "",
      status = "",
      sortBy = "createdAt",
      sortOrder = "ASC",
      page = 1,
      size = 10,
    } = req.query;

    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (brand_id) whereClause.brand_id = brand_id;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "name",
      "code",
      "sku",
      "status",
      "product_id",
    ];

    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sort = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const products = await Product.findAndCountAll({
      attributes: {
        include: [
          [
            fn("COALESCE", fn("SUM", col("product_details.quantity")), 0),
            "totalQuantity",
          ],
        ],
      },
      include: [
        {
          model: ProductDetail,
          as: "product_details",
          attributes: [],
        },
        {
          model: Brand,
          as: "brand",
        },
      ],
      where: whereClause,
      group: ["products.product_id", "brand.brand_id"],
      limit,
      offset,
      order: [[sortField, sort]],
      subQuery: false,
    });
    const enrichedProducts = await Promise.all(
      products.rows.map(async (product) => {
        let colorData = [];
        if (product.color !== null) {
          try {
            const parsedColor = JSON.parse(product.color);
            if (Array.isArray(parsedColor)) {
              for (const colorItem of parsedColor) {
                const color = await Color.findByPk(colorItem.color);
                const images = await Media.findAll({
                  where: { id: { [Op.in]: colorItem.img || [] } },
                });

                const imageLinks = images.map((image) => {
                  const base64 = image.data.toString("base64");
                  const mimeType = image.mimetype;
                  const link = `data:${mimeType};base64,${base64}`;
                  return {
                    id: image.id,
                    link,
                  };
                });

                colorData.push({
                  color,
                  images: imageLinks,
                });
              }
            }
          } catch (e) {
            console.warn("Không thể parse trường color:", product.color);
          }
        }

        return {
          product_id: product.product_id,
          name: product.name,
          code: product.code,
          description: product.description,
          brand: product.brand,
          sku: product.sku,
          color: colorData,
          status: product.status,
          total_quantity: parseInt(product.get("totalQuantity")) || 0,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
      }),
    );
    const totalCount = await Product.count({ where: whereClause });

    return res.status(200).json({
      status: "success",
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
      data: enrichedProducts,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

exports.getProductById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findByPk(id, {
    include: [
      {
        model: Brand,
        as: "brand",
      },
    ],
  });

  if (!product) {
    return res.status(404).json({
      status: "error",
      message: "Product not found",
    });
  }

  let colorData = [];
  if (product.color !== null) {
    try {
      const parsedColor = JSON.parse(product.color);
      if (Array.isArray(parsedColor)) {
        for (const colorItem of parsedColor) {
          const color = await Color.findByPk(colorItem.color);
          const images = await Media.findAll({
            where: { id: { [Op.in]: colorItem.img || [] } },
          });

          const imageLinks = images.map((image) => {
            const base64 = image.data.toString("base64");
            const mimeType = image.mimetype;
            const link = `data:${mimeType};base64,${base64}`;
            return {
              id: image.id,
              link,
            };
          });

          colorData.push({
            color,
            images: imageLinks,
          });
        }
      }
    } catch (e) {
      console.warn("Không thể parse trường color:", product.color);
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      product_id: product.product_id,
      name: product.name,
      code: product.code,
      description: product.description,
      brand: product.brand,
      sku: product.sku,
      color: colorData,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    },
  });
});

exports.createProduct = catchAsync(async (req, res, next) => {
  try {
    const { name, code, description, brand_id, sku, color } = req.body;

    if (!name || !code || !description || !brand_id || !sku || !color) {
      return res.status(400).json({
        status: "Error",
        message: "Thiếu các trường bắt buộc",
      });
    }

    const checkProduct = await Product.findOne({ where: { sku } });
    if (checkProduct) {
      return res.status(400).json({
        status: "Error",
        message: "Sản phẩm đã tồn tại với SKU này",
      });
    }
    const colorString = color ? JSON.stringify(color) : null;

    const newProduct = await Product.create({
      name,
      code,
      description,
      brand_id,
      sku,
      color: colorString,
      status: "ACTIVE",
    });

    res.status(201).json({
      status: "Success",
      data: newProduct,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Error",
      message: error.message,
    });
  }
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, brand_id, sku, status, color } = req.body;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        status: "Error",
        message: "Sản phẩm không tồn tại",
      });
    }

    const checkProduct = await Product.findOne({
      where: {
        sku: sku,
        product_id: { [Op.ne]: id },
      },
    });

    if (checkProduct) {
      return res.status(400).json({
        status: "Error",
        message: "Sản phẩm đã tồn tại với SKU này",
      });
    }
    product.name = name;
    product.code = code;
    product.description = description;
    product.brand_id = brand_id;
    product.sku = sku;
    product.status = status || product.status;
    product.color = color ? JSON.stringify(color) : null;
    await product.save();
    res.status(200).json({
      status: "Success",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Error",
      message: error.message,
    });
  }
});

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy sản phẩm chi tiết với ID này",
      });
    }

    await product.update({ status: "INACTIVE" });

    return res.status(204).json({
      status: "success",
      message: "Sản phẩm  đã được xóa thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// GET /api/v1/admin/orders
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const { count, rows } = await Order.findAndCountAll({
    order: [["createdAt", "DESC"]],
    offset: Number(offset),
    limit: Number(limit),
  });
  res.status(200).json({ status: "success", total: count, orders: rows });
});

// GET /api/v1/admin/users
exports.getAllUsers = catchAsync(async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      gender,
      birth_date,
      role,
    } = req.query;

    const offset = (page - 1) * limit;

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        where(cast(col("user_id"), "TEXT"), {
          [Op.iLike]: `%${search}%`,
        }),
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (gender) {
      whereClause.gender = gender;
    }

    if (birth_date) {
      whereClause.birth_date = birth_date;
    }

    if (role) {
      whereClause.role = role;
    }
    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      offset: Number(offset),
      limit: Number(limit),
    });

    res.status(200).json({
      status: "success",
      total: count,
      page: Number(page),
      limit: Number(limit),
      users: rows,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});
exports.deleteUser = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "User not found",
      });
    }

    user.status = "INACTIVE";

    await user.save();

    return res.status(200).json({
      status: "success",
      message: "Xoá user thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});
// GET /api/v1/admin/orders/total-revenue
exports.getTotalRevenue = catchAsync(async (req, res, next) => {
  const result = await Order.findOne({
    attributes: [[fn("SUM", col("total_amount")), "totalRevenue"]],
    where: { status: "DELIVERED" }, // Sửa lại chỉ còn 'DELIVERED'
  });
  res
    .status(200)
    .json({ status: "success", totalRevenue: result.get("totalRevenue") || 0 });
});

// GET /api/v1/admin/orders/revenue-by-month
exports.getRevenueByMonth = catchAsync(async (req, res, next) => {
  const result = await Order.findAll({
    attributes: [
      [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
      [fn("SUM", col("total_amount")), "revenue"],
    ],
    where: { status: "DELIVERED" }, // Sửa lại chỉ còn 'DELIVERED'
    group: [literal("month")],
    order: [[literal("month"), "DESC"]],
  });
  res.status(200).json({ status: "success", revenueByMonth: result });
});

// GET /api/v1/admin/orders/count-by-month
exports.getOrderCountByMonth = catchAsync(async (req, res, next) => {
  const result = await Order.findAll({
    attributes: [
      [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
      [fn("COUNT", "*"), "orderCount"],
    ],
    group: [literal("month")],
    order: [[literal("month"), "DESC"]],
  });
  res.status(200).json({ status: "success", orderCountByMonth: result });
});

// GET /api/v1/admin/products/top-selling
exports.getTopSellingProducts = catchAsync(async (req, res, next) => {
  const result = await Order.sequelize.query(
    `
    SELECT p.product_id, p.name, SUM(oi.quantity) as totalSold
    FROM order_items oi
    JOIN product_details pd ON oi.product_detail_id = pd.product_detail_id
    JOIN products p ON pd.product_id = p.product_id
    JOIN orders o ON oi.order_id = o.order_id
    WHERE o.status = 'PENDING'
    GROUP BY p.product_id, p.name
    ORDER BY totalSold DESC
    LIMIT 5
  `,
    { type: Order.sequelize.QueryTypes.SELECT },
  );
  res.status(200).json({ status: "success", topSelling: result });
});

// GET /api/v1/admin/products/low-stock
exports.getLowStockProducts = catchAsync(async (req, res, next) => {
  const result = await ProductDetail.findAll({
    attributes: ["product_detail_id", "quantity"],
    where: { quantity: { [Op.lte]: 10 } },
    include: [
      {
        model: Product,
        attributes: ["code", "name"], // Lấy đúng tên sản phẩm từ bảng products
      },
    ],
    order: [["quantity", "ASC"]],
    limit: 10,
  });
  res.status(200).json({ status: "success", lowStock: result });
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
      createdAt: { [Op.gte]: today },
    },
  });

  // Số đơn hàng tuần này
  const weekStart = new Date();
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const ordersThisWeek = await Order.count({
    where: {
      createdAt: { [Op.gte]: weekStart },
    },
  });

  // Số đơn hàng tháng này
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const ordersThisMonth = await Order.count({
    where: {
      createdAt: { [Op.gte]: monthStart },
    },
  });

  // Tổng doanh thu (đơn đã giao)
  const totalRevenue =
    (await Order.sum("total_amount", { where: { status: "DELIVERED" } })) || 0;

  // Số lượng người dùng
  const totalUsers = await User.count();

  res.status(200).json({
    status: "success",
    data: {
      totalProducts,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      totalRevenue,
      totalUsers,
    },
  });
};

exports.getAllProductDetails = catchAsync(async (req, res, next) => {
  const details = await ProductDetail.findAll({
    attributes: [
      "product_detail_id",
      "price",
      "quantity",
      "discount",
      "createdAt",
    ],
    include: [
      {
        model: Product,
        attributes: ["code", "name"],
        include: [
          {
            model: Brand,
            attributes: ["name"],
          },
        ],
      },
      {
        model: Color,
        attributes: ["name"],
      },
      {
        model: Memory,
        attributes: ["ram_size", "storage_size"], // Lấy cả RAM và bộ nhớ trong
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  res.status(200).json({
    status: "success",
    total: details.length,
    productDetails: details,
  });
});

exports.getAllProductsWithTotalQuantity = catchAsync(async (req, res, next) => {
  const Brand = require("../models/brand");
  const products = await Product.findAll({
    attributes: [
      "product_id",
      "sku",
      "code",
      "name",
      "description",
      "status",
      [
        fn("COALESCE", fn("SUM", col("product_details.quantity")), 0),
        "totalQuantity",
      ],
      "createdAt", // Thêm dòng này để lấy ngày nhập
    ],
    include: [
      {
        model: ProductDetail,
        attributes: [],
      },
      {
        model: Brand,
        attributes: ["name", "brand_id"], // Lấy tên thương hiệu
      },
    ],
    group: ["products.product_id", "brand.brand_id", "brand.name"],
    order: [["createdAt", "DESC"]],
  });

  res.status(200).json({ status: "success", total: products.length, products });
});

exports.getProductsStockSoldReport = catchAsync(async (req, res, next) => {
  const result = await Product.sequelize.query(
    `
    SELECT
      p.product_id,
      p.code AS productcode,
      p.name AS productname,
      b.name AS brandname,
      pd.product_detail_id AS productdetailid,
      pd.sku,
      pd.price,
      pd.quantity AS totalremaining,
      c.name AS colorname,
      m.ram_size AS ramsize,
      m.storage_size AS storagesize,
      COALESCE(SUM(oi.quantity), 0) AS totalsold
    FROM product_details pd
    JOIN products p ON pd.product_id = p.product_id
    LEFT JOIN brands b ON p.brand_id = b.brand_id
    LEFT JOIN colors c ON pd.color_id = c.color_id
    LEFT JOIN memories m ON pd.memory_id = m.memory_id
    LEFT JOIN order_items oi ON oi.product_detail_id = pd.product_detail_id
    LEFT JOIN orders o ON o.order_id = oi.order_id AND o.status = 'DELIVERED'
    GROUP BY
      p.product_id,
      p.code,
      p.name,
      b.name,
      pd.product_detail_id,
      pd.sku,
      pd.price,
      pd.quantity,
      c.name,
      m.ram_size,
      m.storage_size
    ORDER BY p.name ASC, pd.product_detail_id ASC;
  `,
    { type: Product.sequelize.QueryTypes.SELECT },
  );

  const variants = result.map((item) => ({
    ...item,
    totalsold: parseInt(item.totalsold, 10) || 0,
    totalremaining: parseInt(item.totalremaining, 10) || 0,
  }));

  res.status(200).json({
    status: "success",
    total: variants.length,
    variants,
  });
});

exports.updateProductName = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  const product = await Product.findByPk(id);
  if (!product) {
    return res
      .status(404)
      .json({ status: "error", message: "Product not found" });
  }
  await product.update({ name });
  res.status(200).json({ status: "success", data: product });
});

exports.updateProductDetail = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let { colorName, ramSize, storageSize, price, quantity } = req.body;

  // Tìm product detail theo id
  const productDetail = await ProductDetail.findByPk(id, {
    include: [Color, Memory],
  });
  if (!productDetail) {
    return res
      .status(404)
      .json({ status: "error", message: "Product detail not found" });
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
    where: { ram_size: ramSize, storage_size: storageSize },
  });

  // Kiểm tra trùng lặp (trừ chính bản ghi đang sửa)
  const existed = await ProductDetail.findOne({
    where: {
      product_id: productDetail.product_id,
      color_id: color.color_id,
      memory_id: memory.memory_id,
      product_detail_id: { [Op.ne]: id },
    },
  });
  if (existed) {
    return res.status(400).json({
      status: "error",
      message: "Đã tồn tại biến thể với thông tin này!",
    });
  }

  // Cập nhật thông tin
  await productDetail.update({
    color_id: color.color_id,
    memory_id: memory.memory_id,
    price,
    quantity,
  });

  res.status(200).json({ status: "success", data: productDetail });
});

exports.updateProdfileUser = catchAsync(async (req, res, next) => {
  const id = req.params.id;

  const user = await User.findByPk(id);

  if (!user) {
    return next(new AppError("Không tìm thấy người dùng", 400));
  }

  const allowedFields = [
    "email",
    "full_name",
    "phone_number",
    "address",
    "gender",
    "birth_date",
    "role",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user.setDataValue(field, req.body[field]);
    }
  });

  const { password, ...dataUser } = user.toJSON();

  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    status: "success",
    message: "Cập nhật thông tin tài khoản thành công",
    data: {
      dataUser,
    },
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findByPk(id);
  if (!user) {
    return next(new AppError("Không tìm thấy người dùng", 400));
  }
  const currentUserId = req.userId;
  console.log(currentUserId);
  if (currentUserId === user.user_id) {
    return next(new AppError("Không thể xóa chính tài khoản của mình", 400));
  }
  await user.update({ status: "INACTIVE" });
  return res.status(204).json({
    status: "success",
    message: "Tài khoản đã được xóa thành công",
  });
});

exports.filterUsersByRole = catchAsync(async (req, res, next) => {
  try {
    const {
      role,
      search,
      page = 1,
      size = 10,
      sortBy = "createdAt",
      sortOrder = "ASC",
    } = req.query;

    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    let condition = {};
    if (role) condition.role = role;
    if (search) {
      condition[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const users = await User.findAndCountAll({
      where: { ...condition, status: "ACTIVE" },
      attributes: { exclude: ["password", "password_reset_token"] },
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit,
      offset,
    });

    if (!users.rows.length) {
      return res.status(404).json({
        status: "error",
        message: "Không có user nào",
      });
    }

    res.status(200).json({
      status: "success",
      totalItems: users.count,
      totalPages: Math.ceil(users.count / limit),
      currentPage: parseInt(page),
      data: users.rows,
    });
  } catch (err) {
    next(err);
  }
});
