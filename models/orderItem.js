const { DataTypes } = require("sequelize");
const sequelize = require("./../config/database");
const Order = require("./orders");
const ProductDetail = require("./productDetails");


const OrderItem = sequelize.define(
  "order_items",
  {
    order_item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "orders",
        key: "order_id",
      },
    },
    product_detail_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "product_details",
        key: "product_detail_id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    unit_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    total_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  { timestamps: true }
);

OrderItem.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

OrderItem.belongsTo(ProductDetail, {
  foreignKey: "product_detail_id",
  as: "product_details",
});

module.exports = OrderItem;
