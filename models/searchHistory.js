const { DataTypes } = require("sequelize");
const sequelize = require("./../config/database");

const SearchHistory = sequelize.define(
  "search_histories",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    keyword: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    search_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },

    last_searched_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    underscored: true,
  },
);

module.exports = SearchHistory;
