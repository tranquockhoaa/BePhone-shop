const { DataTypes } = require("sequelize");
const sequelize = require("./../config/database");
const User = require("./user");

const Order = sequelize.define(
  "orders",
  {
    order_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM("COD", "VNPAY"),
      defaultValue: "COD",
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "CONFIRMED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED"
      ),
      defaultValue: "PENDING",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
  },
  {
    timestamps: true,
  }
);

Order.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

module.exports = Order;
