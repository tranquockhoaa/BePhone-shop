const express = require("express");
const adminController = require("../controllers/adminController");
const authController = require("../controllers/authController");
const router = express.Router();

// Bảo vệ tất cả route admin
router.use(authController.protect, authController.restrictTo("admin"));

// Danh sách sản phẩm
router.get("/products", adminController.getAllProducts);
router.get("/products/:id", adminController.getProductById);
router.post("/products/create", adminController.createProduct);
router.put("/products/:id", adminController.updateProduct);
router.delete("/products/:id", adminController.deleteProduct);


// Danh sách đơn hàng
router.get("/orders", adminController.getAllOrders);

// Danh sách người dùng
router.get("/users", adminController.getAllUsers);

// Tổng doanh thu
router.get("/orders/total-revenue", adminController.getTotalRevenue);

// Doanh thu theo tháng
router.get("/orders/revenue-by-month", adminController.getRevenueByMonth);

// Số đơn hàng theo tháng
router.get("/orders/count-by-month", adminController.getOrderCountByMonth);

// Top sản phẩm bán chạy
router.get("/products/top-selling", adminController.getTopSellingProducts);

// Sản phẩm tồn kho thấp
router.get("/products/low-stock", adminController.getLowStockProducts);

// Tổng quan dashboard
router.get("/overview", adminController.getOverview);

router.get("/product-details", adminController.getAllProductDetails);

router.get(
  "/products-with-total-quantity",
  adminController.getAllProductsWithTotalQuantity
);

router.put("/products/:id/name", adminController.updateProductName);



router.put("/product-details/:id", adminController.updateProductDetail);
module.exports = router;