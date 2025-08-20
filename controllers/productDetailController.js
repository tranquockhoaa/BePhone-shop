const { Op } = require("sequelize");

const ProductDetailService = require("./../service/productDetailService");
const catchAsync = require("./../utils/catchAsync");
const ProductDetail = require("../models/productDetails");
const Product = require("../models/product");
const Memory = require("../models/memory");
const Media = require("../models/media");
const Color = require("../models/color");

exports.createProductDetail = catchAsync(async (req, res, next) => {
  const newProductDetails = await ProductDetailService.createProductDetail(
    req.body
  );
  res.status(200).json({
    status: "Done",
    data: newProductDetails,
  });
});

exports.getAllProductDetail = async (req, res) => {
  try {
    const {
      page = 1,
      size = 10,
      sortBy = "createdAt",
      sortOrder = "ASC",
    } = req.query;

    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const productDetails = await ProductDetail.findAndCountAll({
      include: [
        {
          model: Product,
          as: "product",
        },
        {
          model: Memory,
          as: "memory",
        },
      ],
      limit,
      offset,
      where: { status: "ACTIVE" },
      order: [[sortBy, sortOrder.toUpperCase()]],
      raw: false,
    });

    if (!productDetails.rows || productDetails.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Không có sản phẩm chi tiết nào được tìm thấy",
      });
    }

    const enrichedProductDetails = await Promise.all(
      productDetails.rows.map(async (detail) => {
        const productDetail = detail.toJSON();
        const product = productDetail.product;

        if (productDetail.specifications) {
          try {
            productDetail.specifications = JSON.parse(
              productDetail.specifications
            );
          } catch (err) {
            productDetail.specifications = null;
          }
        }

        if (product?.color) {
          try {
            const colorArray = JSON.parse(product.color);
            const enrichedColorArray = await Promise.all(
              colorArray.map(async (colorItem) => {
                const colorRecord = await Color.findByPk(colorItem.color);
                const colorName = colorRecord ? colorRecord.name : null;

                const images = await Media.findAll({
                  where: {
                    id: { [Op.in]: colorItem.img || [] },
                    status: "ACTIVE",
                  },
                });

                const imageUrls = images.map((media) => {
                  const base64 = Buffer.from(media.data, "base64").toString();
                  return `data:${media.mimetype};base64,${base64}`;
                });

                return {
                  color_id: colorItem.color,
                  color_name: colorName,
                  images: imageUrls,
                };
              })
            );

            product.color = enrichedColorArray;
          } catch (err) {
            product.color = null;
          }
        }

        return productDetail;
      })
    );

    return res.status(200).json({
      status: "success",
      totalItems: productDetails.count,
      totalPages: Math.ceil(productDetails.count / limit),
      currentPage: parseInt(page),
      data: enrichedProductDetails,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getProductDetailById = async (req, res) => {
  try {
    const { id } = req.params;

    const detail = await ProductDetail.findByPk(id, {
      include: [
        {
          model: Product,
          as: "product",
        },
        {
          model: Memory,
          as: "memory",
        },
      ],
      raw: false,
    });

    if (!detail) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy sản phẩm chi tiết với ID này",
      });
    }

    const productDetail = detail.toJSON();
    const product = productDetail.product;

    if (productDetail.specifications) {
      try {
        productDetail.specifications = JSON.parse(productDetail.specifications);
      } catch (err) {
        productDetail.specifications = null;
      }
    }

    if (product?.color) {
      try {
        const colorArray = JSON.parse(product.color);
        const enrichedColorArray = await Promise.all(
          colorArray.map(async (colorItem) => {
            const colorRecord = await Color.findByPk(colorItem.color);
            const colorName = colorRecord ? colorRecord.name : null;

            const images = await Media.findAll({
              where: {
                id: { [Op.in]: colorItem.img || [] },
                status: "ACTIVE",
              },
            });

            const imageUrls = images.map((media) => {
              const base64 = Buffer.from(media.data, "base64").toString();
              return `data:${media.mimetype};base64,${base64}`;
            });

            return {
              color_id: colorItem.color,
              color_name: colorName,
              images: imageUrls,
            };
          })
        );

        product.color = enrichedColorArray;
      } catch (err) {
        product.color = null;
      }
    }

    return res.status(200).json({
      status: "success",
      data: productDetail,
    });
  } catch (error) {
    console.error("Error fetching product detail:", error);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
