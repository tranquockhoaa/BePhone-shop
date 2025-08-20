const CartService = require("./../service/cartService");
const Cart = require("./../models/cart");
const catchAsync = require("./../utils/catchAsync");

exports.createCart = catchAsync(async (req, res, next) => {
  try {
    // const user = req.user;
    const { id } = req.body;

    console.log("usser id", id);
    const cart = await Cart.create({ user_id: id });
    res.status(201).json({
      status: "success",
      data: {
        cart,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

exports.addToCart = catchAsync(async (req, res, next) => {
  const cartDetails = await CartService.addToCart(req.userId, req.body);
  res.status(200).json({
    status: "success",
    message: cartDetails,
  });
});

exports.getAllCart = catchAsync(async (req, res, next) => {
  const allCart = await CartService.getAllCart();
  res.status(200).json({
    status: "success",
    data: allCart,
  });
});

exports.getCartById = catchAsync(async (req, res, next) => {
  const cart = await CartService.getCartById(req.params.id);
  res.status(200).json({
    status: "success",
    data: cart,
  });
});

exports.updateCart = catchAsync(async (req, res, next) => {
  const cart = await CartService.updateCart(req.params.id, req.body);
  res.status(200).json({
    status: "success",
    data: cart,
  });
});

exports.getCartByUserId = catchAsync(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Người dùng không tồn tại",
      });
    }

    const cart = await Cart.findOne({ user_id: user.user_id });
    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Giỏ hàng không tồn tại",
      });
    }

    return res.status(200).json({
      status: "success",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

exports.removeCartDetail = async (req, res, next) => {
  try {
    const { cartDetailId } = req.params;
    const success = await CartService.removeCartDetail(cartDetailId);
    if (!success) {
      return res
        .status(404)
        .json({ status: "fail", message: "Cart detail not found" });
    }
    res
      .status(200)
      .json({ status: "success", message: "Product removed from cart" });
  } catch (err) {
    next(err);
  }
};
