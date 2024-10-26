const multer = require('multer')
const sharp = require('sharp')

const Tour = require('./../models/tourModel')

//const APIFeatures = require('./../utils/apiFeatures')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const factory = require('../utils/handlerFactroy')

const multerStorage = multer.memoryStorage()
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true)
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false)
  }
}

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
})

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
])

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) {
    return next()
  }

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quantity: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`)

  // 2) Images
  req.body.images = []
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quantity: 90 })
        .toFile(`public/img/tours/${filename}`)

      req.body.images.push(filename)
    })
  ).then(() => {
    req.body.images.sort((a, b) => {
      return a.split('-')[3] - b.split('-')[3]
    })
  })

  next()
})

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// )

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing name or price'
//     })
//   }
//   next()
// }

// middleware
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5'
  req.query.sort = 'price,-ratingsAverage'
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty'
  next()
}

// controller
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   const features = new APIFeatures(Tour, req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate()
//   const tours = await features.query
//   // 2.const tours = await Tour.find().where('duration').equals(5)
//   // Send response
//   res.status(200).json({
//     status: 'success',
//     // requestedAt: req.requestTime,
//     results: tours.length,
//     data: {
//       tours: tours
//     }
//   })
// })

// exports.getTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findById(req.params.id).populate({
//     path: 'reviews',
//     select: '-__v'
//   })

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404))
//   }
//   //Tour.findOne({ _id: req.params.id })
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour: tour
//     }
//   })
// })

// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body)
//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour
//     }
//   })
// })

// exports.updateTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true
//   })

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404))
//   }

//   res.status(200).json({
//     stataus: 'success',
//     data: {
//       tour: tour
//     }
//   })
// })

exports.getAllTours = factory.getAll(Tour)
exports.getTour = factory.getOne(Tour, { path: 'reviews', select: '-__v' })
exports.createTour = factory.createOne(Tour)
exports.updateTour = factory.updateOne(Tour)
exports.deleteTour = factory.deleteOne(Tour)

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id)

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404))
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null
//   })
// })

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        // _id: '$ratingsAverage',
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ])
  res.status(200).json({
    status: 'success',
    data: {
      stats: stats
    }
  })
})

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1 //2021
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ])
  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  })
})

// 1)/tours-within?distance=233&center=-40,45&unit=mi
// 2)/tours-within/233/center/-40,45/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params
  const [lat, lng] = latlng.split(',')
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat, lng.',
        400
      )
    )
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  })

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  })
})

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params
  const [lat, lng] = latlng.split(',')

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat, lng',
        400
      )
    )
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ])

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  })
})
