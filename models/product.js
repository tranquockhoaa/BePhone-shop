const { DataTypes } = require("sequelize");
const sequelize = require("./../config/database");
const Brand = require("./brand");

const Product = sequelize.define(
  "products",
  {
    product_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.TEXT,
    },

    code: { type: DataTypes.TEXT },
    description: {
      type: DataTypes.TEXT,
    },
    brand_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "brands",
        key: "brand_id",
      },
    },
    sku: {
      type: DataTypes.TEXT,
    },
    color: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      defaultValue: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);


Product.belongsTo(Brand, {
  foreignKey: "brand_id",
  as: "brand",
});


module.exports = Product;
