const { DataTypes } = require('sequelize');
const sequelize = require('./../config/database');

const Brand = sequelize.define(
  'brands',
  {
    brand_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.TEXT,
      unique: true,
    },
    infomation: {
      type: DataTypes.TEXT,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
    },
    icon: {
      type: DataTypes.STRING,
    },
    status : {
      type:DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      defaultValue: 'ACTIVE',
    }
  },

  { timestamps: true },
);

Brand.beforeCreate(async (brand) => {
  const maxSort = await Brand.max('sortOrder');
  brand.sortOrder = (maxSort || 0) + 1;
});

module.exports = Brand;
