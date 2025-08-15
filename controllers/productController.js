const ProductService = require("./../service/productService");
const catchAsync = require("./../utils/catchAsync");
const Product = require("./../models/product");
const Brand = require('../models/brand');

const { Op } = require("sequelize");


exports.getAllProducts = catchAsync(async (req, res, next) => {
  try {
    const {
      name = "",
      code = "",
      description = "",
      brand_id = "",
      sku = "",
      status = "",
      sortBy = "createdAt", 
      sortOrder = "ASC",
      page = 1,
      size = 10,
    } = req.query;

    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const whereClause = {
      status: 'ACTIVE',
    };
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };
    if (code) whereClause.code = { [Op.iLike]: `%${code}%` };
    if (description) whereClause.description = { [Op.iLike]: `%${description}%` };
    if (sku) whereClause.sku = { [Op.iLike]: `%${sku}%` };
    if (status) whereClause.status = status;
    if (brand_id) whereClause.brand_id = brand_id;

    const products = await Product.findAndCountAll({
      include: [
        {
          model: Brand,
          as: "brand",
        },
        
      ],
      where: whereClause,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
    });

    return res.status(200).json({
      status: "success",
      totalItems: products.count,
      totalPages: Math.ceil(products.count / limit),
      currentPage: parseInt(page),
      data: products.rows,
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

  res.status(200).json({
    status: "success",
    data: product,
  });
});


exports.getCodeProductForHomePage = catchAsync(async (req, res, next) => {
  const data = req.query;
  const codes = await ProductService.getCodeProductForHomePage(data);
  res.status(200).json({
    status: "Done",
    data: {
      codes,
    },
  });
});

exports.getLastestProducts = catchAsync(async (req, res, next) => {
  const queryParams = req.query;
  const data = await ProductService.getLastestProducts(queryParams);
  res.status(200).json({
    status: "Done",
    data: {
      data,
    },
  });
});



exports.getInfoDetailByCodeName = catchAsync(async (req, res, next) => {
  const queryParams = req.query;
  const data = await ProductService.getInfoDetailByCodeName(queryParams);
  res.status(200).json({
    status: "Done",
    data: {
      data,
    },
  });
});

exports.getProductByBrand = catchAsync(async (req, res, next) => {
  const queryParams = req.query;
  queryParams._limit = queryParams._limit ? parseInt(queryParams._limit) : 20;
  // sortPrice: 'asc' hoặc 'desc' (nếu không truyền sẽ mặc định theo createdAt DESC)
  const result = await ProductService.getProductByBrand(queryParams);
  res.status(200).json({
    status: "Done",
    products: result.data,
    total: result.total,
  });
});

exports.searchProduct = catchAsync(async (req, res, next) => {
  const queryParams = req.query;
  queryParams._limit = queryParams._limit ? parseInt(queryParams._limit) : 20;
  // sortPrice: 'asc' hoặc 'desc' (nếu không truyền sẽ mặc định theo createdAt DESC)
  const result = await ProductService.searchProduct(queryParams);
  res.status(200).json({
    status: "Done",
    products: result.data,
    total: result.total,
  });
});
