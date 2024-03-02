const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAcync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // user-id-timestamp.jpeg
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

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

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
};

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

//# vid( 164. Adding a /me Endpointv )
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// ------------------------------------------------------------------------------------------------
//# vid(139. Updating the Current User: Data)
exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log('req.file -->', req.file);
  // console.log('req.body -->', req.body);

  // 1) Create Error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        `This route is not for password updates. Please use /updateMyPassword.`,
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

//# vid(140. Deleting the Current User)
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined!, Please Use /signup instead.'
  });
};

// ------------------------------------------------------------------------------------------------
//@ 2A) READ: Get All Tours
//# vid( 163. Factory Functions: Reading )
exports.getAllUsers = factory.getAll(User);

//@ 2B) GENERAL READ: Get A Tour By Id
//# vid( 163. Factory Functions: Reading )
exports.getUser = factory.getOne(User);

//@ General UPDATE: Update Any Document(tour, user review) By Id
//# vid( 162. Factory Functions: Update and Create )
// Don NOT update password with this!
exports.updateUser = factory.updateOne(User);

//@ General DELETE: Delete Any Document(tour, user review) By Id
//# vid( 161. Building Handler Factory Functions: Delete )
exports.deleteUser = factory.deleteOne(User);
