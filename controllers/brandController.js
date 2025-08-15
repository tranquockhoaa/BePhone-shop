const BrandService = require("./../service/brandService");
const catchAsync = require("./../utils/catchAsync");
const Brand = require("./../models/brand");

exports.createBrand = catchAsync(async (req, res, next) => {
  const newBrand = await BrandService.createBrand(req.body);
  res.status(200).json({
    status: "succes",
    data: newBrand,
  });
});

exports.updateBrand = catchAsync(async (req, res, next) => {
  const updateBrand = await BrandService.updateBrand(req.params.id, req.body);
  res.status(200).json({
    status: "success",
    data: updateBrand,
  });
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
    });

    if (!brands || brands.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy brand nào" });
    }

    return res.status(200).json(brands);
  } catch (err) {
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
