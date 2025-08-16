const { DataTypes } = require("sequelize");
const User = require("./user");

const sequelize = require("./../config/database");

const Cart = sequelize.define(
  "carts",
  {
    cart_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    status: {
      type: DataTypes.ENUM("INACTIVE", "ACTIVE", "ORDERED", "CANCELLED"),
      defaultValue: "INACTIVE",
      allowNull: false,
    },
    total: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "User",
        key: "user_id",
      },
    },
  },
  { timestamps: true }
);
Cart.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});
module.exports = Cart;
