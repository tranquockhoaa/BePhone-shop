const userController = require("../controllers/userController");
const express = require("express");
router = express.Router();
const { protect } = require("../middlewares/auth/profile");

router.get("/profile", protect, userController.getProfile);
router.patch("/:id",protect, userController.updateProfile);
router.patch("/avatar/:id",protect, userController.updateAvatar);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password",  userController.resetPassword);
router.put("/change-password",protect, userController.changePassword);



module.exports = router;
