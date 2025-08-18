const { DataTypes } = require("sequelize");
const sequelize = require("./../config/database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = sequelize.define(
  "users",
  {
    user_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    loyalty_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isNumeric: true,
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gender: {
      type: DataTypes.TEXT,
    },
    birth_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("admin", "user", "seller", "editor"),
      allowNull: false,
      defaultValue: "user",
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      defaultValue: "ACTIVE",
    },
    password_changed_at: { type: DataTypes.DATE },
    password_reset_token: {
      type: DataTypes.STRING,
    },
    password_reset_expired: {
      type: DataTypes.DATE,
    },
    status :{
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: 'ACTIVE',
    }
  },
  {
    timestamps: true,
    tableName: "users",
  }
);

const changedPasswordAfter = async (JWTTimestamp) => {
  if (this.password_changed_at) {
    const changedTimestamp = parseInt(
      this.password_changed_at.getTime() / 1000
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

User.prototype.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.password_reset_token = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.password_reset_expired = Date.now() + 100 * 1000;
  return resetToken;
};

User.beforeSave(async (user) => {
  if (user.changed("password")) {
    user.password = await bcrypt.hash(user.password, 10);
    user.password_changed_at = Date.now();
  }
});

module.exports = User;
