const Brand = require('./../models/brand');
const AppError = require('./../utils/appError');

class BrandService {
  static async createBrand(data) {
    const checkBrand = await Brand.findOne({
      where: {
        name: data.name,
      },
    });
    if (checkBrand) {
      throw new AppError('Brand name already exists', 400);
    }
    const newBrand = await Brand.create({
      ...data
    });
    return newBrand;
  }

  static async updateBrand(id, data) {
    const brand = await Brand.findByPk(id);
    await brand.update({
      name: data.name,
      infomation: data.infomation,
      icon: data.icon,
      status: data.status,
    });
    return brand;
  }

  static async getBrandByPk(id) {
    const brand = await Brand.findByPk(id);
    return brand;
  }

  static async getAllBrand() {
    const allBrand = await Brand.findAll();
    return allBrand;
  }

  static async getBrandByName(name) {
    const brand = await Brand.findOne({
      where: {
        name: name,
      },
    });
    if (!brand) {
      throw new AppError('Brand not found', 404);
    }
    return brand;
  }
}

module.exports = BrandService;
