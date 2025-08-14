const cartController = require('../controllers/cartController');
const authController = require('../controllers/authController');
const express = require('express');
router = express.Router();

router.get('/', cartController.getAllCart);
router.post('/', cartController.createCart);
router.put('/:id', cartController.updateCart);
router.post('/add', authController.protect, cartController.addToCart);
router.get('/my-cart', authController.protect, cartController.getCartByUserId);
router.delete('/cart-detail/:cartDetailId', authController.protect, cartController.removeCartDetail);
module.exports = router;
