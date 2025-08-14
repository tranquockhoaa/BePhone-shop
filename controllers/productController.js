const ProductService = require("./../service/productService");
const ProductDetailService = require("./../service/productDetailService");
const catchAsync = require("./../utils/catchAsync");

exports.createProduct = catchAsync(async (req, res, next) => {
  const newProduct = await ProductService.createProduct(req.body);
  res.status(200).json({
    status: "Done",
    data: {
      product: newProduct,
      productDetail: newProduct.productDetails,
    },
  });
});

exports.getCodeProductForHomePage = catchAsync(async (req, res, next) => {
  const data = req.query;
  const codes = await ProductService.getCodeProductForHomePage(data);
  res.status(200).json({
    status: "Done",
    data: {
      codes,
    },
  });
});

exports.getLastestProducts = catchAsync(async (req, res, next) => {
  const queryParams = req.query;
  const data = await ProductService.getLastestProducts(queryParams);
  res.status(200).json({
    status: "Done",
    data: {
      data,
    },
  });
});

exports.getInfoDetailByCodeName = catchAsync(async (req, res, next) => {
  const queryParams = req.query;
  const data = await ProductService.getInfoDetailByCodeName(queryParams);
  res.status(200).json({
    status: "Done",
    data: {
      data,
    },
  });
});

exports.getProductByBrand = catchAsync(async (req, res, next) => {
  const queryParams = req.query;
  queryParams._limit = queryParams._limit ? parseInt(queryParams._limit) : 20;
  // sortPrice: 'asc' hoặc 'desc' (nếu không truyền sẽ mặc định theo createdAt DESC)
  const result = await ProductService.getProductByBrand(queryParams);
  res.status(200).json({
    status: "Done",
    products: result.data,
    total: result.total,
  });
});

exports.searchProduct = catchAsync(async (req, res, next) => {
  const queryParams = req.query;
  queryParams._limit = queryParams._limit ? parseInt(queryParams._limit) : 20;
  // sortPrice: 'asc' hoặc 'desc' (nếu không truyền sẽ mặc định theo createdAt DESC)
  const result = await ProductService.searchProduct(queryParams);
  res.status(200).json({
    status: "Done",
    products: result.data,
    total: result.total,
  });
});
