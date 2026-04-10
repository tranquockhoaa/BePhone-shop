const express = require("express");
const adminController = require("../controllers/adminController");
const authController = require("../controllers/authController");
const brandController = require("../controllers/brandController");

const router = express.Router();

// Bảo vệ tất cả route admin
router.use(authController.protect, authController.restrictTo("admin"));

// Danh sách sản phẩm
router.get("/products", adminController.getAllProducts);
router.get("/products/top-selling", adminController.getTopSellingProducts);
router.get("/products/low-stock", adminController.getLowStockProducts);
router.get(
  "/products-with-total-quantity",
  adminController.getAllProductsWithTotalQuantity,
);
router.get(
  "/products/stock-sales-report",
  adminController.getProductsStockSoldReport,
);
router.get("/products/:id", adminController.getProductById);
router.post("/products/create", adminController.createProduct);
router.put("/products/:id", adminController.updateProduct);
router.delete("/products/:id", adminController.deleteProduct);

router.get("/brand", brandController.getAllBrand);
router.get("/brand/:id", brandController.getBrandByPk);
router.post("/brand", brandController.createBrand);
router.put("/brand/sort", brandController.sortBrand);
router.put("/brand/:id", brandController.updateBrand);

router.put("/update-profile/:id", adminController.updateProdfileUser);
router.delete("/user/:id", adminController.deleteUser);

// Danh sách đơn hàng
router.get("/orders", adminController.getAllOrders);

// Danh sách người dùng
router.get("/users", adminController.getAllUsers);
router.delete("/users/:id", adminController.deleteUser);

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
  adminController.getAllProductsWithTotalQuantity,
);
router.get(
  "/products/stock-sales-report",
  adminController.getProductsStockSoldReport,
);

router.put("/products/:id/name", adminController.updateProductName);

router.put("/product-details/:id", adminController.updateProductDetail);
module.exports = router;
