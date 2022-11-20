const express = require('express')

const reviewController = require('./../controllers/reviewController')
const authController = require('./../controllers/authController')

// api/v1/reviews & api/v1/tours/:tourId/reviews
const router = express.Router({ mergeParams: true }) //从父路由导入params对象

router.use(authController.protect)

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  )

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )

module.exports = router
