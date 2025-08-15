const ProductDetailService = require('./../service/productDetailService');
const catchAsync = require('./../utils/catchAsync');
const ProductDetail = require("../models/productDetails");
const Product = require("../models/product");
const Memory = require("../models/memory");
const Media = require("../models/media");
exports.createProductDetail = catchAsync(async (req, res, next) => {
  const newProductDetails = await ProductDetailService.createProductDetail(
    req.body,
  );
  res.status(200).json({
    status: 'Done',
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
      where: {status: 'ACTIVE'},
      order: [[sortBy, sortOrder.toUpperCase()]],
      raw: false,
    });

    if (!productDetails.rows || productDetails.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Không có sản phẩm chi tiết nào được tìm thấy",
      });
    }

    const formatted = await Promise.all(
      productDetails.rows.map(async (detail) => {
        const data = detail.toJSON();

        if (data.image) {
          try {
            const parsedImage = JSON.parse(data.image);
            const allImageIds = Object.values(parsedImage).flat();

            const images = await Media.findAll({
              where: {
                id: allImageIds,
              },
            });

            const imageMap = {};
            images.forEach((img) => {
              const base64 = img.data.toString("base64");
              const dataUrl = `data:${img.mimetype};base64,${base64}`;
              imageMap[img.id] = dataUrl;
            });

            for (const color in parsedImage) {
              parsedImage[color] = parsedImage[color].map(
                (id) => imageMap[id] || null
              );
            }

            data.image = parsedImage;
          } catch (err) {
            console.warn("Không thể parse image:", data.image);
          }
        }

        if (data.specifications) {
          try {
            data.specifications = JSON.parse(data.specifications);
          } catch {
            console.warn(
              "Không thể parse specifications:",
              data.specifications
            );
          }
        }

        return data;
      })
    );

    return res.status(200).json({
      status: "success",
      totalItems: productDetails.count,
      totalPages: Math.ceil(productDetails.count / limit),
      currentPage: parseInt(page),
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};


exports.getProductDetailById = catchAsync(async (req, res, next) => {
  const productDetail = await ProductDetailService.getProductDetailByid(
    req.params.id,
  );
  res.status(200).json({
    status: 'Done',
    data: productDetail,
  });
});
