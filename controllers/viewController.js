const Tour = require('./../models/tourModel')
const User = require('./../models/userModel')
const Booking = require('./../models/bookingModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')

exports.getOverview = catchAsync(async (req, res) => {
  // 1) Get tour data from collection
  const tours = await Tour.find()
  // 2) Build template
  // 3) Render that template using tour data from 1)
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  })
})

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data, for the requested tour (including reviews tour guides)
  const tour = await Tour.find({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  })
  if (tour.length === 0) {
    return next(new AppError('There is no tour with that name!', 404))
  }

  // 2) Build template
  // 3) Render template using data from 1)
  res.status(200).render('tour', {
    title: `${tour[0].name} Tour`,
    tour: tour[0]
  })
})

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Login into your account'
  })
}

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  })
}

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id })
  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map(el => el.tour)
  const tours = await Tour.find({ _id: { $in: tourIDs } })

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  })
})

exports.updateUserData = catchAsync(async (req, res, next) => {
  const { name, email } = req.body
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name,
      email
    },
    {
      new: true,
      runValidators: true
    }
  )
  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser
  })
})
