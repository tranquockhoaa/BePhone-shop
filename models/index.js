const sequelize = require("./../config/database");
const User = require("./user");
const Product = require("./product");
const Color = require("./color");
const ProductDetails = require("./productDetails");
const Brand = require("./brand");
const Image = require("./image");
const CartDetail = require("./cartDetail");
const Cart = require("./cart");
const Review = require("./review");
const Memory = require("./memory");
const Voucher = require("./voucher");
const UserVoucher = require("./userVoucher");
const ReviewImage = require("./reviewImage");
const UserProductView = require("./userProductView");
defineAssociations = require("./../config/associations");

defineAssociations();

const syncDB = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("All models synchronized with database");
  } catch (error) {
    console.error("Error syncing database:", error);
  }
};

syncDB();

module.exports = {
  User,
  Product,
  Color,
  ProductDetails,

  Brand,
  Image,
  Cart,
  CartDetail,
  Review,
  Memory,
  Voucher,
  UserVoucher,
  UserProductView,
  ReviewImage,
};
