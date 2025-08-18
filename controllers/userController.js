const User = require("./../models/user");
const UserService = require("./../service/userService");
const redisClient = require("./../config/redis");
const bcrypt = require("bcryptjs")
const { sendVerificationEmail } = require("../service/emailService");

const catchAsync = require("./../utils/catchAsync");
const { json } = require("sequelize");

function generateCode(length = 6) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.getUserByFullName = catchAsync(async (req, res, next) => {
  const { fullName } = req.params;
  const users = await User.findAll({ where: { full_name: fullName } });
  res.status(200).json({
    status: "done",
    data: users,
  });
});

exports.getProfile = async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      status: "success",
      data: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        avatar: user.avatar,
        address: user.address,
        gender: user.gender,
        birth_date: user.birth_date,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server." });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { email, full_name, phone_number, address, gender, birth_date } =
      req.body;
    const id = req.params.id;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Người dùng không tồn tại.",
      });
    }
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) {
        return res.status(400).json({
          status: "error",
          message: "Email đã được sử dụng bởi người dùng khác.",
        });
      }
      user.email = email;
    }
    if (full_name !== undefined) user.full_name = full_name;
    if (phone_number !== undefined) user.phone_number = phone_number;
    if (address !== undefined) user.address = address;
    if (gender !== undefined) user.gender = gender;
    if (birth_date !== undefined) user.birth_date = birth_date;

    await user.save();
    res.status(200).json({
      status: "success",
      message: "Cập nhật thông tin người dùng thành công.",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi khi cập nhật thông tin người dùng.",
    });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    const id = req.params.id;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Người dùng không tồn tại.",
      });
    }

    if (!avatar) {
      return res.status(400).json({
        status: "error",
        message: "Avatar không được để trống.",
      });
    }

    if (avatar !== undefined) user.avatar = avatar;
    await user.save();
    res.status(200).json({
      status: "success",
      message: "Cập nhật thành công avatar",
      data: avatar,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi khi cập nhật thông tin người dùng.",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const code = generateCode();
    const user = req.user;
    if (!user) return res.status(404).json({ error: "User không tồn tại" });
    await sendVerificationEmail(user.email, code);
    await redisClient.setEx(user.email, 300, code);

    res.json({ message: "Mã xác nhận đã được gửi đến email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi gửi email." });
  }
};

exports.resetPassword = async (req, res) => {
   const { email, code, newPassword } = req.body;
  try {
    const user = req.user;

    const storedCode = await redisClient.get(email);
    if (!storedCode)
      return res
        .status(400)
        .json({ error: "Mã code đã hết hạn hoặc không tồn tại" });
    if (storedCode !== code)
      return res.status(400).json({ error: "Mã code không đúng" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User không tồn tại' });

    user.password = newPassword;
    await user.save();

    await redisClient.del(email);

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};
