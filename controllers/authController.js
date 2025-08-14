const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('./../models/user');
const bcrypt = require('bcryptjs');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');
const catchAsync = require('./../utils/catchAsync');
const { promisify } = require('util');
const redisClient = require('./../config/redis');
const { v4: uuidv4 } = require('uuid');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const sessionIsValid = catchAsync(async (user) => {
  user_id = user.user_id;
  timeExpire = await redisClient.ttl(`${user_id}:${sessionId}:jwt`);
  return timeExpire > 0;
});

const deleteKeyRedis = catchAsync(async (partten) => {
  const keys = await redisClient.keys(partten);
  console.log(keys);
  if (keys.length)
    await Promise.all(
      keys.map((e) => {
        redisClient.del(e);
      }),
    );
  console.log('deleteToken success');
});
// sesssion token user id
//
const createSendToken = async (user, statusCode, res) => {
  const token = signToken(user.user_id);
  const expiredJWT = Number(process.env.JWT_EXPIRES_IN);
  console.log(expiredJWT);
  const key = `${user.user_id}:jwt:${token}`;

  redisClient.set(key, token, { EX: expiredJWT });
  res.status(statusCode).json({
    status: 'success',
    token,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const isRegistered = await User.findOne({ where: { email: req.body.email } });
  console.log(isRegistered);
  if (isRegistered) {
    throw new AppError('this email is registered');
  }

  const newUser = await User.create({
    account: req.body.account,
    password: req.body.password,
    email: req.body.email,
    phone_number: req.body.phone_number,
    full_name: req.body.full_name,
    birth_date: req.body.birthDate,
    address: req.body.address,
    gender: req.body.gender,
  });
  createSendToken(newUser, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(401).json({
      status: 'Fail',
      message: 'Please provide email and password',
    });
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError('Can not find account!', 400));
  }

  const checkPassword = await bcrypt.compare(password, user.password);
  if (!checkPassword) {
    return next(new AppError('Password is incorrect!'));
  }

  // Trả về role để FE điều hướng
  const token = signToken(user.user_id);
  const expiredJWT = Number(process.env.JWT_EXPIRES_IN);
  const key = `${user.user_id}:jwt:${token}`;
  redisClient.set(key, token, { EX: expiredJWT });

  res.status(200).json({
    status: 'success',
    token,
    user: {
      id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    }
  });
});
exports.protect = catchAsync(async (req, res, next) => {
  console.log('protect running');
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(new AppError('you are not login!'));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const keyRedis = `${decoded.id}:jwt:${token}`;
  const keyRedisIsValid = () => {
    return redisClient.ttl(keyRedis) > 0;
  };
  if (!keyRedisIsValid) return next(new AppError('Token is not valid'));
  console.log('key is valid');
  const currentUser = await User.findByPk(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does no longer exit'),
    );
  }
  req.userId = currentUser.user_id;
  next();
});

exports.prevent = catchAsync(async (req, res, next) => {
  sessionId = req.params.token;
  if (sessionIsValid(sessionId) == false) {
    return next(new AppError('session is invalid'));
  }
  const token = await redisClient.get(`${user_id}:${sessionId}:jwt`);
  console.log(token);
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findByPk(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does no longer exit'),
    );
  }
  req.user = currentUser;
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    where: { email: req.body.email },
  });

  if (!user) {
    return next(new AppError('There is no user with email address', 404));
  }
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetURL = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/user/resetPassword/${resetToken}`;

  await sendEmail({
    email: user.email,
    subject: 'forgot password',
    message: resetURL,
  });
  res.status(200).json({
    status: 'success',
    message: 'Token sent to email',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    where: { password_reset_token: hashedToken },
  });

  if (!user) {
    return next(new AppError('Token invalid or has expired', 400));
  }

  user.password = req.body.password;
  const validToken = () => {
    const timeNow = new Date();
    password_reset_expired = user.password_reset_expired;
    return password_reset_expired.getTime() > timeNow.getTime();
  };
  if (!validToken()) return next(new AppError('Token is invalid or expired'));

  user.setDataValue('password_reset_token', null);
  user.setDataValue('password_reset_expired', null);
  await user.save({ validateBeforeSave: false });
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { password, newPassword } = req.body;

  const user = await User.findByPk(req.user.user_id);
  if (!user) {
    return next(new AppError('Can not find account', 400));
  }

  const checkPassword = await bcrypt.compare(password, user.password);
  if (!checkPassword) {
    return next(new AppError('Password is incorrect'));
  }

  user.password = newPassword;
  await user.save();
  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(new AppError('invalid token'));
  }
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const user_id = decode.id;
  if (req.params.type == 'All') {
    deleteKeyRedis(`${user_id}:jwt*`);
    res.status(200).json({
      status: 'Done',
      message: 'All device has been logout',
    });
  }
  deleteKeyRedis(`${user_id}:jwt:${token}`);
  res.status(200).json({
    status: 'Done',
    message: 'Account has been logout',
  });
  
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Giả sử user đã được gán vào req.userId ở middleware protect
    User.findByPk(req.userId).then(user => {
      if (!user || !roles.includes(user.role)) {
        return next(new AppError('Bạn không có quyền truy cập chức năng này!', 403));
      }
      next();
    }).catch(err => next(err));
  };
};

// controllers/authController.js
// controllers/authController.js
exports.registerAdmin = catchAsync(async (req, res, next) => {
  const { full_name, email, password, phone_number, address } = req.body;
  const user = await User.create({
    full_name,
    email,
    password,
    phone_number,
    address,
    role: 'admin'
  });
  res.status(201).json({ status: 'success', data: user });
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    User.findByPk(req.userId).then(user => {
      if (!user || !roles.includes(user.role)) {
        return next(new AppError('Bạn không có quyền truy cập chức năng này!', 403));
      }
      next();
    }).catch(err => next(err));
  };
};