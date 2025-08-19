const { Op, fn, col, literal, where } = require("sequelize");
const sequelize = require("../config/database");
const Order = require("../models/orders");
const OrderItem = require("../models/orderItem");
const ProductDetails = require("../models/productDetails");
const Product = require("../models/product");




exports.getRevenue = async (req, res) => {
  try {
    const { month, year } = req.query;

    let whereCondition = {
      status: "DELIVERED",
    };

    const andConditions = [];

    if (year) {
      andConditions.push(
        where(sequelize.literal('EXTRACT(YEAR FROM "createdAt")'), year)
      );
    }

    if (month) {
      andConditions.push(
        where(sequelize.literal('EXTRACT(MONTH FROM "createdAt")'), month)
      );
    }

    if (andConditions.length > 0) {
      whereCondition = {
        ...whereCondition,
        [Op.and]: andConditions,
      };
    }

    const totalRevenueResult = await Order.findOne({
      attributes: [
        [fn("SUM", col("total_amount")), "totalRevenue"],
        [fn("COUNT", col("order_id")), "totalOrders"],
      ],
      where: whereCondition,
      raw: true,
    });

    const totalRevenue = parseFloat(totalRevenueResult.totalRevenue || 0);
    const totalOrders = parseInt(totalRevenueResult.totalOrders || 0);

    let monthsCount = 1;

    if (year && month) {
      monthsCount = 1;
    } else if (year) {
      monthsCount = 12;
    } else {
      const months = await Order.findAll({
        attributes: [
          [sequelize.literal('EXTRACT(MONTH FROM "createdAt")'), "month"],
          [sequelize.literal('EXTRACT(YEAR FROM "createdAt")'), "year"],
        ],
        where: {
          status: "DELIVERED",
        },
        group: ["month", "year"],
        raw: true,
      });

      monthsCount = months.length || 1;
    }

    const averageMonthlyRevenue = totalRevenue / monthsCount;

    let groupedRevenue = [];

    if (year && month) {
      groupedRevenue = await Order.findAll({
        attributes: [
          [sequelize.literal('DATE("createdAt")'), "date"],
          [fn("SUM", col("total_amount")), "dailyRevenue"],
          [fn("COUNT", col("order_id")), "dailyOrders"],
        ],
        where: whereCondition,
        group: [sequelize.literal('DATE("createdAt")')],
        order: [[sequelize.literal('DATE("createdAt")'), "ASC"]],
        raw: true,
      });
    } else if (year) {
      groupedRevenue = await Order.findAll({
        attributes: [
          [sequelize.literal('EXTRACT(MONTH FROM "createdAt")'), "month"],
          [fn("SUM", col("total_amount")), "monthlyRevenue"],
          [fn("COUNT", col("order_id")), "monthlyOrders"],
        ],
        where: whereCondition,
        group: [sequelize.literal('EXTRACT(MONTH FROM "createdAt")')],
        order: [[sequelize.literal('EXTRACT(MONTH FROM "createdAt")'), "ASC"]],
        raw: true,
      });
    }

    return res.status(200).json({
      totalRevenue,
      totalOrders,
      averageMonthlyRevenue: parseFloat(averageMonthlyRevenue.toFixed(2)),
      revenueStats: groupedRevenue,
    });
  } catch (error) {
    console.error("Error calculating revenue:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



exports.getTopSellingProducts = async (req, res) => {
  try {
    const topProducts = await OrderItem.findAll({
      attributes: [
        [col("order_items.product_detail_id"), "product_detail_id"],
        [fn("SUM", col("order_items.quantity")), "totalSold"],
      ],
      include: [
        {
          model: ProductDetails,
          as: "product_details",
          attributes: ["product_detail_id", "product_id", "sku"],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["name", "code"],
            },
          ],
        },
      ],
      group: [
        col("order_items.product_detail_id"),
        col("product_details.product_detail_id"),
        col("product_details.product_id"),
        col("product_details.sku"),
        col("product_details.product.product_id"),
        col("product_details.product.name"),
        col("product_details.product.code"),
      ],
      order: [[fn("SUM", col("order_items.quantity")), "DESC"]],
      limit: 10,
      raw: false,
    });

    const result = topProducts.map((item) => ({
      productDetailId: item.product_detail_id,
      sku: item.product_details.sku,
      productId: item.product_details.product_id,
      productName: item.product_details.product.name,
      productCode: item.product_details.product.code,
      totalSold: parseInt(item.getDataValue("totalSold")),
    }));

    return res.status(200).json({ topProducts: result });
  } catch (error) {
    console.error("Error fetching top selling products:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};