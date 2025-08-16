const { DataTypes } = require("sequelize");
const ProductDetail = require("./productDetails");

const sequelize = require("./../config/database");

const CartDetails = sequelize.define(
  "cart_details",
  {
    cart_detail_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    unit_price: {
      type: DataTypes.FLOAT,
    },
    product_detail_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
       references: {
        model: "product_details",
        key: "product_detail_id",
      },
    },
     total: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    cart_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { timestamps: true }
);

CartDetails.belongsTo(ProductDetail, {
  foreignKey: "product_detail_id",
  as: "product_detail",
});

module.exports = CartDetails;
