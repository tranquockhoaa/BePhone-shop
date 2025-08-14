const CartDetailService = require('./../service/cartDetailService');
const CartDetail = require('../models/cartDetail');
const catchAsync = require('./../utils/catchAsync');

exports.createCartDetail = catchAsync(async (req, res, next) => {
  const newCartDetail = await CartDetailService.createCartDetail(req.body);
  res.status(200).json({
    status: 'success',
    data: newCartDetail,
  });
});

exports.updateCartDetail = catchAsync(async (req, res, next) => {
  const cartDetail = await CartDetailService.updateCartDetail(
    req.params.id,
    req.body,
  );
  res.status(200).json({
    status: 'success',
    data: cartDetail,
  });
});

exports.getAllCartDetail = catchAsync(async (req, res, next) => {
  const allCartDetail = await CartDetailService.getAllCartDetail();
  res.status(200).json({
    status: 'success',
    data: allCartDetail,
  });
}); 

exports.getCartDetailById = catchAsync(async (req, res, next) => {
  const cartDetail = await CartDetailService.getCartDetailById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: cartDetail,
  });
});

exports.removeCartDetail = catchAsync(async (req, res, next) => {
  const message = await CartDetailService.removeCartDetail(req.params.idCart);
  res.status(200).json({
    status: 'success',
    message: message,
  });
});



exports.changeQuantity = catchAsync(async (req, res, next) => {
  const userId = req.userId; // Lấy userId từ middleware protect
  const cartDetailId = req.params.id;
  const changeType = req.params.changeType;

  // Tìm cart detail theo cart_detail_id và user_id
  const cartDetail = await CartDetail.findOne({
    where: { cart_detail_id: cartDetailId },
    include: {
      model: require('../models/cart'),
      as: 'cart',
      where: { user_id: userId }
    }
  });

  if (!cartDetail) {
    return res.status(404).json({ status: 'fail', message: 'Không tìm thấy sản phẩm trong giỏ hàng của bạn' });
  }

  // Gọi service để tăng/giảm số lượng
  const updated = await CartDetailService.changeQuantity(cartDetailId, changeType);
  res.status(200).json({
    status: 'success',
    data: updated,
  });
});