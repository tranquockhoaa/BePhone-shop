const ProductService = require('./../service/productService');
const catchAsync = require('./../utils/catchAsync');
const Product = require('./../models/product');
const Brand = require('../models/brand');
const Media = require('../models/media');
const Color = require('../models/color');
const ProductDetails = require('../models/productDetails');
const Memory = require('../models/memory');

const { Op } = require('sequelize');

exports.getAllProducts = catchAsync(async (req, res, next) => {
  try {
    const {
      brand_id = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'ASC',
      page = 1,
      size = 10,
      search,
    } = req.query;

    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const whereClause = {
      status: 'ACTIVE',
    };

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
      'createdAt',
      'updatedAt',
      'name',
      'code',
      'sku',
      'status',
      'product_id',
    ];

    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sort = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const products = await Product.findAndCountAll({
      include: [
        {
          model: Brand,
          as: 'brand',
        },
      ],
      where: whereClause,
      limit,
      offset,
      order: [[sortField, sort]],
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
                  const base64 = image.data.toString('base64');
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
            console.warn('Không thể parse trường color:', product.color);
          }
        }

        const productDetails = await ProductDetails.findAll({
          where: { product_id: product.product_id },
          include: [
            { model: Color, as: 'color' },
            { model: Memory, as: 'memory' },
          ],
        });

        return {
          product_id: product.product_id,
          name: product.name,
          code: product.code,
          description: product.description,
          brand: product.brand,
          sku: product.sku,
          color: colorData,
          productDetails,
          status: product.status,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
      })
    );

    return res.status(200).json({
      status: 'success',
      totalItems: products.count,
      totalPages: Math.ceil(products.count / limit),
      currentPage: parseInt(page),
      data: enrichedProducts,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
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
        as: 'brand',
      },
    ],
  });

  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found',
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
            const base64 = image.data.toString('base64');
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
      console.warn('Không thể parse trường color:', product.color);
    }
  }

  const productDetails = await ProductDetails.findAll({
    where: { product_id: product.product_id },
    include: [
      { model: Color, as: 'color' },
      { model: Memory, as: 'memory' },
    ],
  });

  res.status(200).json({
    status: 'success',
    data: {
      product_id: product.product_id,
      name: product.name,
      code: product.code,
      description: product.description,
      brand: product.brand,
      sku: product.sku,
      color: colorData,
      productDetails,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    },
  });
});

exports.getCodeProductForHomePage = catchAsync(async (req, res, next) => {
  const data = req.query;
  const codes = await ProductService.getCodeProductForHomePage(data);
  res.status(200).json({
    status: 'Done',
    data: {
      codes,
    },
  });
});

exports.getLastestProducts = catchAsync(async (req, res, next) => {
  const queryParams = req.query;
  const data = await ProductService.getLastestProducts(queryParams);
  res.status(200).json({
    status: 'Done',
    data: {
      data,
    },
  });
});

exports.getInfoDetailByCodeName = catchAsync(async (req, res, next) => {
  const queryParams = req.query;
  const data = await ProductService.getInfoDetailByCodeName(queryParams);
  res.status(200).json({
    status: 'Done',
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
    status: 'Done',
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
    status: 'Done',
    products: result.data,
    total: result.total,
  });
});
