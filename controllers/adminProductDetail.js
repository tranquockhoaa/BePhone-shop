const ProductDetail = require("../models/productDetails");
const Product = require("../models/product");
const Memory = require("../models/memory");
const Media = require("../models/media");
const { Op } = require("sequelize");

exports.createProductDetail = async (req, res) => {
  try {
    const {
      price,
      quantity,
      discount,
      sku,
      specifications,
      productId,
      ramSize,
      storageSize,
    } = req.body;

    if (!price || !quantity || !specifications) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu các trường bắt buộc",
      });
    }

    const product_id = parseInt(productId);
    const newProductDetail = await ProductDetail.create({
      price,
      quantity,
      discount,
      sku,
      specifications,
      product_id: product_id,
      ramSize,
      storageSize,
      memory_id: 1,
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

    if (status) {
      whereClause.status = status;
    }
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const orderDirection = sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC";
    const productWhereClause = {};

    if (search) {
      const isNumeric = /^\d+$/.test(search.trim());
      if (isNumeric) {
        productWhereClause.product_id = parseInt(search);
      } else {
        productWhereClause.name = {
          [Op.iLike]: `%${search}%`,
        };
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
      ],
      limit,
      offset,
      where: whereClause,
      order: [[finalSortBy, orderDirection]],
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

exports.getProductDetailById = async (req, res) => {
  try {
    const { id } = req.params;

    const productDetail = await ProductDetail.findByPk(id, {
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

    if (!productDetail) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy sản phẩm chi tiết với ID này",
      });
    }

    const data = productDetail.toJSON();

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
        console.warn("Không thể parse specifications:", data.specifications);
      }
    }

    return res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
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
      memory_id,
      color_id,
      status,
    } = req.body;

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
      memory_id,
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
