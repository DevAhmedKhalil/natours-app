const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');
// const catchAsync = require('./../utils/catchAcync');

//# vid( 162. Factory Functions: Update and Create )
exports.setTourUserIds = (req, res, next) => {
  //# vid( 158. Implementing Simple Nested Routes )
  // Allow nested routes => from createReview
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

//@ CRUD Opreations

//@ 1) CREATE: Create a new tour
exports.createReview = factory.createOne(Review);

//@ 2A) READ: Get All Tours
//# vid( 163. Factory Functions: Reading )
exports.getAllReviews = factory.getAll(Review);

//@ 2B) General GET: Get A Tour By Id
//# vid( 163. Factory Functions: Reading )
exports.getReview = factory.getOne(Review);

//@ 3) UPDATE: Update A Tour By Id
//# vid( 162. Factory Functions: Update and Create )
exports.updateReview = factory.updateOne(Review);

//@ 4) DELETE: Delete A Tour By Id
//# vid( 161. Building Handler Factory Functions: Delete )
exports.deleteReview = factory.deleteOne(Review);
