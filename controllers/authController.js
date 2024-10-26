const { promisify } = require('util')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const User = require('./../models/userModel')

const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const Email = require('./../utils/email')

// 设置jwt token
const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
}

// 设置cookies, 返回用户信息
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id)
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000 // 90d
    ),
    // secure: false, // 设置为true时，仅在https时有效
    httpOnly: true, // 不允许浏览器修改cookie,
    secure: true
  }
  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true
  res.cookie('jwt', token, cookieOptions)

  // Remove password from output
  user.password = undefined

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  })
}

// 用户注册
exports.signup = catchAsync(async (req, res, next) => {
  // 1) 用户注册信息
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role
  })

  // 2) 发送注册成功通知邮件
  const url = `${req.protocol}://${req.get('host')}/me`
  await new Email(newUser, url).sendWelcome()

  // 3) 设置cookie并返回
  createSendToken(newUser, 201, res)
})

// 用户登录
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body
  // 1) 检测邮箱，密码是否存在 (check if email and password exist)
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400))
  }

  // 2) 检测用户是否存在/密码是否正确 (check if user exists && password is correct)
  const user = await User.findOne({ email }).select('+password')

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401))
  }

  // 3) 设置cookie并返回, (If everything OK, send token to client)
  createSendToken(user, 200, res)
})

// 用户登出
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 100),
    httpOnly: true,
    secure: true
  })
  res.status(200).json({
    status: 'success'
  })
}

// 校验当前用户是否有效
exports.protect = catchAsync(async (req, res, next) => {
  // 1) 是否携带token (Getting token and check of it's there)
  let token = ''
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please login to get access.', 401)
    )
  }

  // 2) token校验 (Verification token)
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

  // 3) 校验用户是否存在(Check if user still exists)
  const currentUser = await User.findById(decoded.id)
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does not longer exist.',
        401
      )
    )
  }

  // 4) 校验用户是否处于有效登录态 (Check if user changed password after the JWT was issued)
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again', 401)
    )
  }

  // 5) 授权访问受保护的路由 (GRANT ACCESS TO PROTECTED ROUTE)
  req.user = currentUser // 用于后续controller使用
  res.locals.user = currentUser // 用于渲染时，注入变量
  next()
})

// 只在渲染时使用，没有错误返回设定 (Only for rendered pages, no errors!)
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    // 1) 校验token (verify token)
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    )

    // 2) 用户是否存在 (Check if user still exists)
    const currentUser = await User.findById(decoded.id)
    if (!currentUser) {
      return next()
    }

    // 3) 用户是否有效 (Check if user changed password after the token was issued)
    if (currentUser.changePasswordAfter(decoded.iat)) {
      return next()
    }

    // 4) There is a logged in user
    res.locals.user = currentUser
  }
  next()
})

// 限制某些用户权限
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      )
    }
    next()
  }
}

// 忘记密码
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) 根据邮箱获取用户信息 (Get user based on POSTed email)
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    return next(new AppError('There is no user with email address.', 404))
  }

  // 2) 生成随机重置密码token (Generate the random reset token)
  const resetToken = user.createPasswordResetToken()
  await user.save({ validateBeforeSave: false }) // 不进行校验

  // 这里没有单独抽离的原因在于： 这种错误不像常规的api错误，可以简单的return next(new AppError())，还需要对user进行一些操作
  // 另一种特殊情况是在errorhandler里，根据错误类型再进行操作，由于设计到userModel，简单处理在这
  try {
    // 3) Sent it to user's email
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`
    await new Email(user, resetURL).sendPasswordReset()

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    })
  } catch (err) {
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save({ validateBeforeSave: true })

    return next(
      new AppError('There was an eror sending the email. Try again later!', 500)
    )
  }
})

// 重置密码
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) 通过resetToken获取用户 (Get user based on the token)
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  })

  // 2) 用户失效 (If token has not expired, and there is user, set the new password)
  if (!user) {
    next(new AppError('token is invalid or expired', 400))
  }

  // 3) 更新用户相关信息 (Update changedPasswordAt property for the user)
  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()

  // 4) jwt签名 (Log the user in, send JWT)
  createSendToken(user, 200, res)
})

// 修改密码
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) 获取当前用户 (Get user from collection)
  const user = await User.findById(req.user.id).select('+password')

  // 2) 检测输入的用户密码是否正确 (Check if POSTed current password is correct)
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401))
  }
  // 3) 修改密码 (If so, update password)
  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  await user.save()
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) 设置jwt (Log user in, send JWT)
  createSendToken(user, 200, res)
})
