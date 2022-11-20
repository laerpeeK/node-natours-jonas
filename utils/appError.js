class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error'
    // 非系统性错误
    this.isOperational = true

    // 使constructor的调用不出现在错误调用栈中
    Error.captureStackTrace(this, this.constructor)
  }
}

module.exports = AppError
