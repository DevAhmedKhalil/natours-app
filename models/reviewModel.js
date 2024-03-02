//# vid( 154. Modelling Reviews: Parent Referencing )
const mongoose = require('mongoose');
const Tour = require('./tourModel');

// review / rating / createdAt / ref to tour / ref to user
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.']
      // each review document now knows What's TOUR it belongs to
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.']
      // each review document now knows What's USER it belongs to
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//# vid( 170. Preventing Duplicate Reviews )
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//& DOCUMENT MIDDLEWARES: runs before .save() and .create()

//# vid( 156. Populating Reviews )
reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour', // "tour" must be in the mongoose.Schema
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });

  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

//# vid( 168. Calculating Average Rating on Tours - Part 1 )
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  // console.log('TourID: ', tourId);
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  // console.log(stats);

  //# vid( 168 && 169 )
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

//# vid( 168. Calculating Average Rating on Tours - Part 1 )
// this middleware not pre save it is post save to make sure it is saved to DB
reviewSchema.post('save', function() {
  // this points to current review
  this.constructor.calcAverageRatings(this.tour);
  // next();
});

//# vid( 169. Calculating Average Rating on Tours - Part 2 )
// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next) {
  // await tis.findOne(); does not work here, query has already executed
  this.r = await this.findOne();
  // console.log(this.r);
  next();
});
reviewSchema.post(/^findOneAnd/, async function() {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
