const BrandService = require("./../service/brandService");
const catchAsync = require("./../utils/catchAsync");
const Brand = require("./../models/brand");
const Product = require("./../models/product");
const sequelize = require("../config/database");

exports.createBrand = catchAsync(async (req, res, next) => {
  const newBrand = await BrandService.createBrand(req.body);
  res.status(200).json({
    status: "succes",
    data: newBrand,
  });
});

exports.updateBrand = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, name, infomation, icon, sortOrder } = req.body;

    const brand = await Brand.findByPk(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    if (name) brand.name = name;
    if (infomation) brand.infomation = infomation;
    if (icon) brand.icon = icon;
    if (sortOrder) brand.sortOrder = sortOrder;
    if (status) brand.status = status;

    await brand.save();

    // Update products of this brand
    await Product.update(
      { status },
      { where: { brand_id: id } }
    );

    const products = await Product.findAll({
      where: { brand_id: id },
      attributes: ['product_id']
    });

    const productIds = products.map(product => product.product_id);

    if (productIds.length > 0) {
      const ProductDetails = require('../models/productDetails');

      await ProductDetails.update(
        { status },
        {
          where: {
            product_id: productIds
          }
        }
      );
    }

    res.status(200).json({
      status: "success",
      data: {
        brand,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "Error",
      message: error.message,
    });
  }
});



exports.getBrandByPk = catchAsync(async (req, res, next) => {
  const brand = await BrandService.getBrandByPk(req.params.id);
  res.status(200).json({
    status: "success",
    data: brand,
  });
});

exports.getAllBrand = async (req, res) => {
  const order = req.query.order?.toUpperCase() === "DESC" ? "DESC" : "ASC";

  try {
    const brands = await Brand.findAll({
      order: [["sortOrder", order]],
      include: [
        {
          model: Product,
          as: "products", 
          required: false, 
          include: [
            {
              model: ProductDetails,
              as: "product_details",
              required: false, 
              attributes: [], 
            },
          ],
          attributes: {
            include: [
              [
                sequelize.fn("COUNT", sequelize.col("product_details.product_detail_id")),
                "productDetailCount",
              ],
            ],
          },
        },
      ],
      attributes: {
        include: [
          [
            sequelize.fn("COUNT", sequelize.col("products.product_id")),
            "productCount",
          ],
        ],
      },
      group: ["brands.brand_id", "products.product_id"], 
    });

    if (!brands || brands.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy brand nào" });
    }

    return res.status(200).json(brands);
  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: "Lỗi khi lấy danh sách brand" });
  }
};


exports.getBrandByName = catchAsync(async (req, res, next) => {
  const brand = await BrandService.getBrandByName(req.query);
  res.status(200).json({
    status: "success",
    data: brand,
  });
});

exports.sortBrand = async (req, res) => {
  const newOrder = req.body;
  try {
    const updatePromises = newOrder.map((item) =>
      Brand.update(
        { sortOrder: item.sortOrder },
        { where: { brand_id: item.brand_id } }
      )
    );
    await Promise.all(updatePromises);
    res.json({ message: "Cập nhật thứ tự thành công" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi cập nhật thứ tự" });
  }
};

exports.getAllBrandForUser = async (req, res) => {
  const order = req.query.order?.toUpperCase() === "DESC" ? "DESC" : "ASC";

  try {
    const brands = await Brand.findAll({
      order: [["sortOrder", order]],
      where: { status: "ACTIVE" },
    });

    if (!brands || brands.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy brand nào" });
    }

    return res.status(200).json(brands);
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lấy danh sách brand" });
  }
};
