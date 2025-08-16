const cartDetailcontroller = require('../controllers/cartDetailController');
const authController = require('../controllers/authController');
const { protect } = require("../middlewares/auth/profile");

const express = require('express');

router = express.Router();

router.get('/',protect, cartDetailcontroller.getCartDetails);
router.post('/add-to-card',protect, cartDetailcontroller.addToCard);
router.patch('/increase-quantity',protect, cartDetailcontroller.increaseCartDetailQuantity);
router.patch('/decrease-quantity',protect, cartDetailcontroller.decreaseCartDetailQuantity);
router.patch('/update-cart',protect, cartDetailcontroller.updateCartDetail);
router.delete('/remove-product',protect, cartDetailcontroller.removeCartDetail);
router.delete('/clear-cart',protect, cartDetailcontroller.clearCart);




module.exports = router;
