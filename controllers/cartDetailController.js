const CartDetail = require("../models/cartDetail");
const Cart = require("./../models/cart");
const ProductDetail = require("./../models/productDetails");
const Product = require("./../models/product");
const Brand = require("./../models/brand");
const Memory = require("./../models/memory");
const Color = require("./../models/color");
const Media = require("./../models/media");



const catchAsync = require("./../utils/catchAsync");

const calculateCartTotal = async (cart_id) => {
  const cartDetails = await CartDetail.findAll({
    where: { cart_id },
    attributes: ["total"],
  });

  return cartDetails.reduce((sum, item) => sum + item.total, 0);
};

exports.getCartDetails = catchAsync(async (req, res, next) => {
  const user = req.user;

  const cart = await Cart.findOne({
    where: {
      user_id: user.user_id,
      status: "ACTIVE",
    },
  });

  if (!cart) {
    return res.status(404).json({
      status: "error",
      message: "Không tìm thấy giỏ hàng.",
    });
  }

  const cartDetailsRaw = await CartDetail.findAll({
    where: {
      cart_id: cart.cart_id,
    },
    attributes: { exclude: ["product_detail_id"] },
    include: [
      {
        model: ProductDetail,
        as: "product_detail",
        attributes: {
          exclude: ["memory_id", "product_id"],
        },
        include: [
          {
            model: Product,
            as: "product",
            attributes: { exclude: ["brand_id"] },
            include: [
              {
                model: Brand,
                as: "brand",
              },
            ],
          },
          {
            model: Memory,
            as: "memory",
          },
          {
            model: Color,
            as: "color",
          },
        ],
      },
    ],
  });

  const cartDetails = await Promise.all(
    cartDetailsRaw.map(async (item) => {
      const data = item.toJSON();

      const detail = data.product_detail;

      // Parse image
      if (detail && detail.image) {
        try {
          const parsedImage = JSON.parse(detail.image);
          const allImageIds = Object.values(parsedImage).flat();

          const images = await Media.findAll({
            where: {
              id: allImageIds,
            },
          });

          const imageMap = {};
          images.forEach((img) => {
            const base64 = img.data.toString("base64");
            const dataUrl = `data:${img.mimetype};base64,${base64}`;
            imageMap[img.id] = dataUrl;
          });

          for (const color in parsedImage) {
            parsedImage[color] = parsedImage[color].map(
              (id) => imageMap[id] || null
            );
          }

          detail.image = parsedImage;
        } catch (err) {
          console.warn("Không thể parse image:", detail.image);
        }
      }

      if (detail && detail.specifications) {
        try {
          detail.specifications = JSON.parse(detail.specifications);
        } catch (err) {
          console.warn("Không thể parse specifications:", detail.specifications);
        }
      }

      return data;
    })
  );

  return res.status(200).json({
    status: "success",
    data: {
      cart_id: cart.cart_id,
      status: cart.status,
      cartDetails,
    },
  });
});

exports.addToCard = catchAsync(async (req, res, next) => {
  try {
    const user = req.user;
    const { product_detail_id, quantity, unit_price } = req.body;

    if (!product_detail_id || !quantity || !unit_price) {
      return res.status(400).json({
        status: "error",
        message:
          "Thiếu thông tin: product_detail_id, quantity hoặc unit_price.",
      });
    }

    const product = await ProductDetail.findByPk(product_detail_id);
    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy sản phẩm.",
      });
    }

    let cart = await Cart.findOne({
      where: {
        user_id: user.user_id,
      },
    });

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Người dùng chưa có giỏ hàng",
      });
    }

    const existingCartDetail = await CartDetail.findOne({
      where: {
        cart_id: cart.cart_id,
        product_detail_id: product_detail_id,
      },
    });

    if (existingCartDetail) {
      const newQuantity = existingCartDetail.quantity + quantity;
      if (newQuantity > product.quantity) {
        return res.status(400).json({
          status: "error",
          message: `Chỉ còn ${product.quantity} sản phẩm trong kho.`,
        });
      }
      existingCartDetail.quantity = newQuantity;
      existingCartDetail.total = newQuantity * existingCartDetail.unit_price;
      await existingCartDetail.save();

      cart.status = "ACTIVE";
      cart.total = await calculateCartTotal(cart.cart_id);
      await cart.save();

      return res.status(200).json({
        status: "success",
        message: "Thêm sản phẩm vào giỏ hàng thành công",
        data: {
          cart_detail: existingCartDetail,
        },
      });
    } else {
      if (quantity > product.quantity) {
        return res.status(400).json({
          status: "error",
          message: `Sản phẩm đã hết`,
        });
      }
      const total = unit_price * quantity;
      const cartDetail = await CartDetail.create({
        cart_id: cart.cart_id,
        product_detail_id,
        quantity,
        unit_price,
        total,
      });

      cart.status = "ACTIVE";
      cart.total = await calculateCartTotal(cart.cart_id);
      await cart.save();

      return res.status(201).json({
        status: "success",
        message: "Thêm sản phẩm vào giỏ hàng thành công.",
        data: {
          cart_detail: cartDetail,
        },
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

exports.increaseCartDetailQuantity = catchAsync(async (req, res, next) => {
  try {
    const user = req.user;
    const { product_detail_id } = req.body;

    if (!product_detail_id) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu product_detail_id.",
      });
    }

    const cart = await Cart.findOne({
      where: {
        user_id: user.user_id,
        status: "ACTIVE",
      },
    });

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy giỏ hàng.",
      });
    }

    const cartDetail = await CartDetail.findOne({
      where: {
        cart_id: cart.cart_id,
        product_detail_id,
      },
    });

    if (!cartDetail) {
      return res.status(404).json({
        status: "error",
        message: "Sản phẩm không có trong giỏ hàng.",
      });
    }

    const product = await ProductDetail.findByPk(product_detail_id);
    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy sản phẩm.",
      });
    }

    if (cartDetail.quantity + 1 > product.quantity) {
      return res.status(400).json({
        status: "error",
        message: `Chỉ còn ${product.quantity} sản phẩm trong kho.`,
      });
    }

    cartDetail.quantity += 1;
    cartDetail.total = cartDetail.quantity * cartDetail.unit_price;
    await cartDetail.save();

    cart.total = await calculateCartTotal(cart.cart_id);
    await cart.save();

    res.status(200).json({
      status: "success",
      message: "Tăng số lượng thành công.",
      data: {
        cart_detail: cartDetail,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

exports.decreaseCartDetailQuantity = catchAsync(async (req, res, next) => {
  try {
    const user = req.user;
    const { product_detail_id } = req.body;

    if (!product_detail_id) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu product_detail_id.",
      });
    }

    const cart = await Cart.findOne({
      where: {
        user_id: user.user_id,
        status: "ACTIVE",
      },
    });

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy giỏ hàng.",
      });
    }

    const cartDetail = await CartDetail.findOne({
      where: {
        cart_id: cart.cart_id,
        product_detail_id,
      },
    });

    if (!cartDetail) {
      return res.status(404).json({
        status: "error",
        message: "Sản phẩm không có trong giỏ hàng.",
      });
    }

    if (cartDetail.quantity <= 1) {
      await cartDetail.destroy();
    } else {
      cartDetail.quantity -= 1;
      cartDetail.total = cartDetail.quantity * cartDetail.unit_price;
      await cartDetail.save();
    }

    cart.total = await calculateCartTotal(cart.cart_id);
    await cart.save();

    res.status(200).json({
      status: "success",
      message: "Giảm số lượng thành công.",
      data: {
        cart_detail: cartDetail,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

exports.removeCartDetail = catchAsync(async (req, res, next) => {
  try {
    const user = req.user;
    const { product_detail_id } = req.body;

    if (!product_detail_id) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu product_detail_id.",
      });
    }

    const cart = await Cart.findOne({
      where: {
        user_id: user.user_id,
        status: "ACTIVE",
      },
    });

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy giỏ hàng.",
      });
    }

    const cartDetail = await CartDetail.findOne({
      where: {
        cart_id: cart.cart_id,
        product_detail_id,
      },
    });

    if (!cartDetail) {
      return res.status(404).json({
        status: "error",
        message: "Sản phẩm không tồn tại trong giỏ hàng.",
      });
    }

    await cartDetail.destroy();

    cart.total = await calculateCartTotal(cart.cart_id);
    await cart.save();

    return res.status(200).json({
      status: "success",
      message: "Xoá sản phẩm khỏi giỏ hàng thành công.",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

exports.clearCart = catchAsync(async (req, res, next) => {
  try {
    const user = req.user;

    const cart = await Cart.findOne({
      where: {
        user_id: user.user_id,
        status: "ACTIVE",
      },
    });

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy giỏ hàng.",
      });
    }

    const deletedCount = await CartDetail.destroy({
      where: {
        cart_id: cart.cart_id,
      },
    });

    cart.status = "INACTIVE";
    cart.total = 0;
    await cart.save();
    return res.status(200).json({
      status: "success",
      message: `Đã xoá ${deletedCount} sản phẩm khỏi giỏ hàng.`,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

exports.updateCartDetail = catchAsync(async (req, res, next) => {
  try {
    const user = req.user;
    const { product_detail_id, quantity } = req.body;

    if (!product_detail_id || typeof quantity !== "number") {
      return res.status(400).json({
        status: "error",
        message: "Thiếu product_detail_id hoặc số lượng không hợp lệ.",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        status: "error",
        message: "Số lượng phải lớn hơn 0.",
      });
    }

    const cart = await Cart.findOne({
      where: {
        user_id: user.user_id,
        status: "ACTIVE",
      },
    });

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy giỏ hàng.",
      });
    }

    const cartDetail = await CartDetail.findOne({
      where: {
        cart_id: cart.cart_id,
        product_detail_id,
      },
    });

    if (!cartDetail) {
      return res.status(404).json({
        status: "error",
        message: "Sản phẩm không tồn tại trong giỏ hàng.",
      });
    }

    const productDetail = await ProductDetail.findByPk(product_detail_id);
    if (!productDetail || productDetail.quantity < quantity) {
      return res.status(400).json({
        status: "error",
        message: "Số lượng trong kho không đủ.",
      });
    }

    cartDetail.quantity = quantity;
    cartDetail.total = quantity * cartDetail.unit_price;
    await cartDetail.save();

    cart.total = await calculateCartTotal(cart.cart_id);
    await cart.save();

    return res.status(200).json({
      status: "success",
      message: "Cập nhật số lượng thành công.",
      data: cartDetail,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});
