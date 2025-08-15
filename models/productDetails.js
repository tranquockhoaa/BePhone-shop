const { DataTypes } = require("sequelize");
const sequelize = require("./../config/database");
const Product = require("./product");
const Memory = require("./memory");
const ProductDetails = sequelize.define(
  "product_details",
  {
    product_detail_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    price: {
      type: DataTypes.FLOAT,
    },
    quantity: {
      type: DataTypes.INTEGER,
    },
    discount: {
      type: DataTypes.TEXT,
    },
    pubmetadata: {
      type: DataTypes.JSON,
    },
    specifications: {
      type: DataTypes.TEXT,
      // get() {
      //   const raw = this.getDataValue("specifications");
      //   try {
      //     return raw ? JSON.parse(raw) : null;
      //   } catch {
      //     return raw;
      //   }
      // },
    },
    sku: {
      type: DataTypes.STRING,
    },
    image: {
      type: DataTypes.TEXT,
     
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "products",
        key: "product_id",
      },
    },
    memory_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "memories",
        key: "memory_id",
      },
    },
  },

  { timestamps: true, underscored: true }
);

ProductDetails.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

ProductDetails.belongsTo(Memory, {
  foreignKey: "memory_id",
  as: "memory",
});
module.exports = ProductDetails;
