const { DataTypes } = require("sequelize");
const sequelize = require("./../config/database");

const UserProductView = sequelize.define(
  "user_product_views",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },

    last_viewed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    underscored: true,
  },
);

module.exports = UserProductView;
