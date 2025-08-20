const cartController = require("../controllers/cartController");
const express = require("express");
const { protect } = require("../middlewares/auth/profile");

router = express.Router();

router.get("/", protect, cartController.getCartByUserId);
// router.get('/:id',protect, cartController.getCartByUserId);
router.post("/", cartController.createCart);

module.exports = router;
