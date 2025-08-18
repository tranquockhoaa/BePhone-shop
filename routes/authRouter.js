const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);
router.patch(
  "/updatePassword",
  authController.protect,
  authController.updatePassword,
  authController.logout
);
// router.get(
//   '/:fullName',
//   authController.protect,
//   userController.getUserByFullName,
// );
router.post("/logout/:type", authController.logout);
router.post("/logout", authController.logout);
// routes/authRouter.js
router.post("/register-admin", authController.registerAdmin);
module.exports = router;
