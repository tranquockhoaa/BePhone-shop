const catchAsync = require("../utils/catchAsync");
const Order = require("../models/orders");
const User = require("../models/user");
const OrderItem = require("../models/orderItem");
const ProductDetail = require("../models/productDetails");
const Product = require("../models/product");
const Memory = require("../models/memory");
const Color = require("../models/color");
const Media = require("../models/media");

const { Op } = require("sequelize");

exports.getOrdersList = catchAsync(async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      payment_method,
      sortBy = "createdAt",
      sortOrder = "ASC",
    } = req.query;

    const allowedSortFields = [
      "createdAt",
      "total_amount",
      "status",
      "phone_number",
      "payment_method",
    ];
    const allowedSortOrders = ["ASC", "DESC"];

    const finalSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "ASC";

    const whereConditions = {};

    if (status) whereConditions.status = status;
    if (payment_method) whereConditions.payment_method = payment_method;
    if (search) {
      whereConditions[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: rawOrders } = await Order.findAndCountAll({
      include: [
        {
          model: User,
          as: "user",
        },
        {
          model: OrderItem,
          as: "order_items",
          include: [
            {
              model: ProductDetail,
              as: "product_details",
              include: [
                {
                  model: Product,
                  as: "product",
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
            },
          ],
        },
      ],
      where: whereConditions,
      limit: +limit,
      offset: (+page - 1) * +limit,
      order: [[finalSortBy, finalSortOrder]],
    });

    const enrichedOrders = await Promise.all(
      rawOrders.map(async (order) => {
        const enrichedItems = await Promise.all(
          order.order_items.map(async (item) => {
            const productDetail = item.product_details;
            const product = productDetail?.product;

            if (productDetail?.specifications) {
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
                      color_id: parseInt(item.color_id, 10),
                      color_name: colorName,
                      images: imageLinks,
                    };
                  })
                );

                product.color = enrichedColorArray;
              } catch (err) {
                product.color = null;
              }
            }

            return item;
          })
        );

        order.order_items = enrichedItems;

        return order;
      })
    );

    res.status(200).json({
      status: "success",
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: enrichedOrders,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});
// 2. Xem chi tiết đơn hàng
exports.getOrderDetails = catchAsync(async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: { order_id: orderId },
      include: [
        {
          model: User,
          as: "user",
        },
        {
          model: OrderItem,
          as: "order_items",
          include: [
            {
              model: ProductDetail,
              as: "product_details",
              include: [
                {
                  model: Product,
                  as: "product",
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
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const orderData = order.toJSON();

    if (orderData.order_items && orderData.order_items.length > 0) {
      await Promise.all(
        orderData.order_items.map(async (item) => {
          const detail = item.product_details;
          const product = detail?.product;

          if (detail?.image) {
            try {
              const parsedImage = JSON.parse(detail.image);
              const allImageIds = Object.values(parsedImage).flat();

              const images = await Media.findAll({
                where: {
                  id: allImageIds,
                  status: "ACTIVE",
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

              detail.image = parsedImage;
            } catch (err) {
              console.warn("Không thể parse image:", detail.image);
              detail.image = null;
            }
          }

          // Parse specifications
          if (detail?.specifications) {
            try {
              detail.specifications = JSON.parse(detail.specifications);
            } catch (err) {
              console.warn(
                "Không thể parse specifications:",
                detail.specifications
              );
              detail.specifications = null;
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
                })
              );

              product.color = enrichedColorArray;
            } catch (err) {
              console.warn("Không thể enrich product.color");
              product.color = null;
            }
          }
        })
      );
    }

    res.status(200).json({
      status: "success",
      data: orderData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

exports.updateOrder = catchAsync(async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ where: { order_id: orderId } });

    if (!order) {
      return res
        .status(404)
        .json({ status: "fail", message: "Order not found" });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      status: "success",
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// 5. Xóa đơn hàng
exports.deleteOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findOne({ where: { order_id: orderId } });

  if (!order) {
    return res.status(404).json({ status: "fail", message: "Order not found" });
  }

  await order.destroy();

  res.status(200).json({
    status: "success",
    message: "Order deleted successfully",
  });
});
