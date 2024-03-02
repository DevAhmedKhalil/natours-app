// const fs = require('fs');
const multer = require('multer');
// const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAcync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage(); // img storage as a buffer

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.single('image');    --->  req.file
// upload.array('images', 5); --->  req.files

exports.resizeTourImages = (req, res, next) => {
  // console.log('req.files ----> ', req.files);
  next();
};

//# Middleware Top Cheapest 5 Tours (-ratingsAverage,price)
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverages,summary,difficulty';
  next();
};

//----------------------------------------------------------------
//@ CRUD Opreations

//@ 1) GENERAL CREATE: Create a new tour
//# vid( 162. Factory Functions: Update and Create )
exports.createTour = factory.createOne(Tour);

//@ 2A) READ: Get All Tours
//# vid( 163. Factory Functions: Reading )
exports.getAllTours = factory.getAll(Tour);

//@ 2B) GENERAL READ: Get A Tour By Id
//# vid( 163. Factory Functions: Reading )
exports.getTour = factory.getOne(Tour, { path: 'reviews' });

//@ 3) GENERAL UPDATE: Update A Tour By Idd
//# vid( 162. Factory Functions: Update and Create )
// Do not update password with this!
exports.updateTour = factory.updateOne(Tour);

//@ 4) GENERAL DELETE: Delete A Tour By Id
//# vid( 161. Building Handler Factory Functions: Delete )
// Do not update password with this!
exports.deleteTour = factory.deleteOne(Tour);

//----------------------------------------------------------------

// 102. Aggregation Pipeline: Matching and Grouping
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        // _id: '$ratingsAverage',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 } //# 1 assending
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } } //% $ne Not Equal
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

// 103. Aggregation Pipeline: Unwinding and Projecting
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021
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
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

//----------------------------------------------------------------
//# vid( 171. Geospatial Queries: Finding Tours Within Radius )
// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.11349/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const latlngArray = latlng.split(',');
  const lat = parseFloat(latlngArray[0]);
  const lng = parseFloat(latlngArray[1]);

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and logitude in the format lat,lng.',
        400
      )
    );
  }
  // console.log(distance, lat, lng, unit);
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

//----------------------------------------------------------------
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const latlngArray = latlng.split(',');
  const lat = parseFloat(latlngArray[0]);
  const lng = parseFloat(latlngArray[1]);

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and logitude in the format lat,lng.',
        400
      )
    );
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
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
