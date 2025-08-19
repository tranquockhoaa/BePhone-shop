// models/Image.js
const { DataTypes } = require('sequelize');
const sequelize = require('./../config/database');

const Media = sequelize.define(
  'media',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    data: {
      type: DataTypes.TEXT('long'), 
    },
    mimetype: {
      type: DataTypes.STRING, 
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
    }
  },
  { timestamps: true },
);

module.exports = Media;
