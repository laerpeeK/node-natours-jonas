const crypto = require('crypto')
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  email: {
    type: String,
    required: [true, 'please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minLength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only workds on CREATE and SAVE!!!
      validator: function(el) {
        return el === this.password
      },
      message: 'Password are not the same!'
    }
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  }
})

// 只有密码被创建、修改会生效
userSchema.pre('save', async function(next) {
  // 只有密码修改才会触发 (Only run this function if password was actually modified)
  if (!this.isModified('password')) return next()

  // 增加12位盐值编码 (Hash the password with cost of 12)
  this.password = await bcrypt.hash(this.password, 12)

  // 删除密码确认字段 (Delete paaswordConfirm field)
  this.passwordConfirm = undefined
  next()
})

// 只有密码被修改会生效
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next()

  this.passwordChangedAt = Date.now() - 1000
  next()
})

// 只返回active为false的信息
userSchema.pre(/^find/, function(next) {
  // this points to current query
  this.find({ active: { $ne: false } }) //this ---> collection
  next()
})

// 确保密码无误
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

// 登录是否生效
userSchema.methods.changePasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    )
    return JWTTimestamp < changedTimestamp
  }

  // False means NOT changed
  return false
}

// 生成重置密码token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex')
  this.passwordResetToken = crypto //this ---> doc
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000
  return resetToken
}

const User = mongoose.model('User', userSchema)

module.exports = User
