const express = require("express");
const orderController = require("../controllers/orderController");
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/auth/profile");

const router = express.Router();

router.get("/", protect,  orderController.getAllOrder);
router.get("/check-payment-vnpay", orderController.checkPayment);
router.get("/:id", protect,  orderController.getOrderDetails);
router.put("/:id", protect,  orderController.updateOrder);
router.post("/create-payment", protect, orderController.createPayment);



module.exports = router;
