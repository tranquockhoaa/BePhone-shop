const Cart = require('./../models/cart');
const Product = require('./../models/product');
const CartDetail = require('./../models/cartDetail');
const CartDetaiService = require('./cartDetailService');
const ProductDetails = require('../models/productDetails');
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

class CartService {
  

  static async addToCart(userId, data) {
  const quantity = data.quantity ? data.quantity : 1;
  const productDetail = await ProductDetails.findByPk(data.productDetailId);
  if (!productDetail) {
    return `can't find product`;
  }

  // Tìm cart mới nhất của user
  let cart = await Cart.findOne({ where: { user_id: userId }, order: [['cart_id', 'DESC']] });
  if (!cart || cart.status === 'ORDERED') {
    cart = await Cart.create({ user_id: userId, status: 'INACTIVE' });
  }

  const cartId = cart.cart_id;
  let cartDetail = await CartDetail.findOne({
    where: {
      cart_id: cartId,
      product_detail_id: productDetail.product_detail_id,
    },
  });
  if (cartDetail) {
    cartDetail.quantity += quantity;
    await cartDetail.save();
  } else {
    cartDetail = await CartDetaiService.createCartDetail({
      unit_price: productDetail.price,
      quantity: quantity,
      cart_id: cartId,
      product_detail_id: data.productDetailId,
    });
  }
  // Trả về thông tin cartDetail và cart
  return { cart, cartDetail };
}



  static async getAllCart() {
    const allCart = await Cart.findAll();
    return allCart;
  }

  static async getCartById(id) {
    const cart = await CartDetail.findAll({ where: { cart_id: id } });
    return cart;
  }

  static async updateCart(id, data) {
    console.log('ok');
    const updateData = await Cart.findByPk(id);

    await updateData.update({
      total_price: data.totalPrice,
      status: data.status,
    });

    return updateData;
  }

  static async getCartByUserId(userId) {
  // Lấy cart mới nhất của user
  const cart = await Cart.findOne({
    where: { user_id: userId },
    order: [['cart_id', 'DESC']]
  });
  if (!cart || cart.status !== 'INACTIVE') return null;
  // Lấy chi tiết các sản phẩm trong cart kèm thông tin sản phẩm, màu, ram, bộ nhớ, brand
  const query = `
    SELECT 
      cd.cart_detail_id as cartDetailId,
      cd.quantity,
      cd.unit_price,
      pd.product_detail_id as productDetailId,
      p.name AS name,
      pd.price,
      pd.quantity as productQuantity,
      p.code as code,
      m.storage_size,
      m.ram_size,
      c.name AS color,
      b.name AS brand_name
    FROM cart_details cd
    JOIN product_details pd ON cd.product_detail_id = pd.product_detail_id
    JOIN products p ON pd.product_id = p.product_id
    JOIN brands b ON p.brand_id = b.brand_id
    JOIN memories m ON pd.memory_id = m.memory_id
    JOIN colors c ON pd.color_id = c.color_id
    WHERE cd.cart_id = ${cart.cart_id} ORDER BY cd.cart_detail_id DESC
  `;
  const cartDetails = await sequelize.query(query, { type: QueryTypes.SELECT });
  return { cart, cartDetails };
  }

  static async removeCartDetail(cartDetailId) {
    const deleted = await CartDetail.destroy({ where: { cart_detail_id: cartDetailId } });
    return deleted > 0;
  }

}

module.exports = CartService;
