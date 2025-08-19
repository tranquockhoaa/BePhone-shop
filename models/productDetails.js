const { DataTypes } = require("sequelize");
const sequelize = require("./../config/database");
const Product = require("./product");
const Memory = require("./memory");
const Color = require("./color");
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
    color_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "colors",
        key: "color_id",
      },
    },
    sku: {
      type: DataTypes.STRING,
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

ProductDetails.belongsTo(Color, {
  foreignKey: "color_id",
  as: "color",
});
module.exports = ProductDetails;
