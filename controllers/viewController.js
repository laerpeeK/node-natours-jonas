const Tour = require('./../models/tourModel')
const catchAsync = require('./../utils/catchAsync')

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

exports.getTour = catchAsync(async (req, res) => {
  // 1) Get the data, for the requested tour (including reviews tour guides)
  const tour = await Tour.find({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  })
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
