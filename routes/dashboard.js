const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');

router.use(authController.protect, authController.restrictTo('admin'));

router.get("/", dashboardController.getRevenue)
router.get("/best-selling", dashboardController.getTopSellingProducts)

module.exports = router;
