const { Op } = require("sequelize");
const ProductDetail = require("../models/productDetails");
const Product = require("../models/product");
const Memory = require("../models/memory");
const Media = require("../models/media");
const Color = require("../models/color");
exports.createProductDetail = async (req, res) => {
  try {
    const {
      price,
      quantity,
      discount,
      sku,
      color_id,
      specifications,
      productId,
      ramSize = "",
      storageSize,
    } = req.body;

    if (!price || !quantity || !specifications) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu các trường bắt buộc",
      });
    }

    const product_id = parseInt(productId);

    const memory = await Memory.findOne({
      where: {
        ram_size: ramSize,
        storage_size: storageSize,
      },
    });

    if (!memory) {
      return res.status(400).json({
        status: "error",
        message: "Memory không tồn tại",
      });
    }

    const formattedSpecifications =
      specifications && typeof specifications === "object"
        ? JSON.stringify(specifications)
        : specifications;

    const newProductDetail = await ProductDetail.create({
      price,
      quantity,
      discount,
      sku,
      color_id,
      specifications: formattedSpecifications,
      product_id: product_id,
      memory_id: memory.memory_id,
      status: "ACTIVE",
    });

    return res.status(201).json({
      status: "success",
      data: newProductDetail,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getAllProductDetail = async (req, res) => {
  try {
    const {
      page = 1,
      size = 10,
      sortBy = "createdAt",
      sortOrder = "ASC",
      status,
      search,
    } = req.query;

    const validSortFields = [
      "createdAt",
      "updatedAt",
      "price",
      "quantity",
      "status",
    ];
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;

    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const orderDirection = sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const productWhereClause = {};
    if (search) {
      const isNumeric = /^\d+$/.test(search.trim());
      if (isNumeric) {
        productWhereClause.product_id = parseInt(search);
      } else {
        productWhereClause.name = { [Op.iLike]: `%${search}%` };
      }
    }

    const productDetails = await ProductDetail.findAndCountAll({
      include: [
        {
          model: Product,
          as: "product",
          where: Object.keys(productWhereClause).length
            ? productWhereClause
            : undefined,
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
      limit,
      offset,
      where: whereClause,
      order: [[finalSortBy, orderDirection]],
    });

    const enrichedProductDetails = await Promise.all(
      productDetails.rows.map(async (detail) => {
        const productDetail = detail.toJSON();
        const product = productDetail.product;

        if (productDetail.specifications) {
          try {
            productDetail.specifications = JSON.parse(
              productDetail.specifications,
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

                const imageLinks = images.map((image) => {
                  const base64 = image.data.toString("base64");
                  const mimeType = image.mimetype;
                  const link = `data:${mimeType};base64,${base64}`;
                  return {
                    id: image.id,
                    link,
                  };
                });
                return {
                  color_id: colorItem.color,
                  color_name: colorName,
                  images: imageLinks,
                };
              }),
            );

            product.color = enrichedColorArray;
          } catch (err) {
            product.color = null;
          }
        }

        return productDetail;
      }),
    );

    return res.status(200).json({
      status: "success",
      totalItems: productDetails.count,
      totalPages: Math.ceil(productDetails.count / limit),
      currentPage: parseInt(page),
      data: enrichedProductDetails,
    });
  } catch (error) {
    console.error(error);
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

            const imageLinks = images.map((image) => {
              const base64 = image.data.toString("base64");
              const mimeType = image.mimetype;
              const link = `data:${mimeType};base64,${base64}`;
              return {
                id: image.id,
                link,
              };
            });

            return {
              color_id: colorItem.color,
              color_name: colorName,
              images: imageLinks,
            };
          }),
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

exports.updateProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      price,
      quantity,
      discount,
      sku,
      specifications,
      product_id,
      ramSize = "",
      storageSize,
      color_id,
      status,
    } = req.body;

    const memory = await Memory.findOne({
      where: {
        ram_size: ramSize,
        storage_size: storageSize,
      },
    });

    if (!memory) {
      return res.status(400).json({
        status: "error",
        message: "Memory không tồn tại",
      });
    }

    const productDetail = await ProductDetail.findByPk(id);
    if (!productDetail) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy sản phẩm chi tiết với ID này",
      });
    }
    const updatedProductDetail = await productDetail.update({
      price,
      quantity,
      discount,
      sku,
      specifications,
      product_id,
      memory_id: memory.memory_id,
      color_id,
      status,
    });

    return res.status(200).json({
      status: "success",
      data: updatedProductDetail,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.deleteProductDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const productDetail = await ProductDetail.findByPk(id);
    if (!productDetail) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy sản phẩm chi tiết với ID này",
      });
    }

    await productDetail.update({ status: "INACTIVE" });

    return res.status(204).json({
      status: "success",
      message: "Sản phẩm chi tiết đã được xóa thành công",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
