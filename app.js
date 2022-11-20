const path = require('path')
const express = require('express')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const cookieParser = require('cookie-parser')

const AppError = require('./utils/appError')

const globalErrorHandler = require('./controllers/errorController')

const tourRouter = require('./routes/tourRoutes')
const userRouter = require('./routes/userRoutes')
const reviewRouter = require('./routes/reviewRoutes')
const viewRouter = require('./routes/viewRoutes')
const bookingRouter = require('./routes/bookingRoutes')

const app = express()

// 设置渲染模板引擎 -pug, 目录 -views
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

// 解析静态文件目录 -public
// app.use(express.static(`${__dirname}/public`))
app.use(express.static(path.join(__dirname, 'public')))

// 1).全局中间件
// 设置安全的HTTP头部如X-Frame-Options防止劫持攻击;
app.use(helmet())

// 设置开发时命令行日志
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// 限制同IP下API请求次数，每小时最多100次，超过提示信息
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
})
app.use('/api', limiter)

// 解析请求体，设置请求体内容最大长度，使req.body能够获取到JSON信息
app.use(
  express.json({
    limit: '10KB'
  })
)
// 能够解析到req.file
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb'
  })
)

// 使req.cookies解析到具体cookies信息
app.use(cookieParser())

// 防止Mongodb注入攻击
app.use(mongoSanitize())

// 防止XSS攻击
app.use(xss())

// 设置查询字段白名单
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
)

// 获取请求发生时刻
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString()
  next()
})

// 设置路由匹配规则
app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/reviews', reviewRouter)
app.use('/api/v1/bookings', bookingRouter)
app.use('/', viewRouter)

// 匹配不到的路径处理方式
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404))
})

// 错误处理
app.use(globalErrorHandler)

module.exports = app
