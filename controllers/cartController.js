const CartService = require('./../service/cartService');
const catchAsync = require('./../utils/catchAsync');

exports.createCart = catchAsync(async (req, res, next) => {
  const newCart = await CartService.createCart(req.body);
  res.status(200).json({
    status: 'success',
    data: newCart,
  });
});

exports.addToCart = catchAsync(async (req, res, next) => {
  console.log(req.body)
  const cartDetails = await CartService.addToCart(req.userId, req.body);
  res.status(200).json({
    status: 'success',
    message: cartDetails,
  });
});

exports.getAllCart = catchAsync(async (req, res, next) => {
  const allCart = await CartService.getAllCart();
  res.status(200).json({
    status: 'success',
    data: allCart,
  });
});

exports.getCartById = catchAsync(async (req, res, next) => {
  const cart = await CartService.getCartById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: cart,
  });
});

exports.updateCart = catchAsync(async (req, res, next) => {
  const cart = await CartService.updateCart(req.params.id, req.body);
  res.status(200).json({
    status: 'success',
    data: cart,
  });
});

exports.getCartByUserId = catchAsync(async (req, res, next) => {
  const result = await CartService.getCartByUserId(req.userId);
  res.status(200).json({
    status: 'success',
    data: result
  });
});

exports.removeCartDetail = async (req, res, next) => {
  try {
    const { cartDetailId } = req.params;
    const success = await CartService.removeCartDetail(cartDetailId);
    if (!success) {
      return res.status(404).json({ status: 'fail', message: 'Cart detail not found' });
    }
    res.status(200).json({ status: 'success', message: 'Product removed from cart' });
  } catch (err) {
    next(err);
  }
};




