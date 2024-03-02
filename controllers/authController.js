const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAcync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

// ------------------------------------------------------------------------------------------------
const signToken = id => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// ------------------------------------------------------------------------------------------------
//# vid(138. Updating the Current User: Password)
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // ----------------------------------
  //* vid(142. Sending JWT via Cookie)
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true, // cookie must be https {so we will make it in production}
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from the output {Body}
  user.password = undefined;
  // ----------------------------------
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user
    }
  });
};

// ------------------------------------------------------------------------------------------------
//# vid(126. Creating New User)
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  const url = `${req.protocol}://${req.get('host')}/me`;
  // console.log(url);
  await new Email(newUser, url).sendWelcome();

  // const newUser = await User.create({
  //   name: req.body.name,
  //   email: req.body.email,
  //   password: req.body.password,
  //   passwordConfirm: req.body.passwordConfirm,
  //   role: req.body.role
  //   // passwordChangedAt: req.body.passwordChangedAt
  // });

  // ------------------------------------------------------------------------------------------------
  //# vid(129. Signing up Users)
  // const token = signToken(newUser._id);

  // res.status(201).json({
  //   status: 'success',
  //   token,
  //   data: {
  //     user: newUser
  //   }
  // });

  //* vid(138. Updating the Current User: Password)
  createSendToken(newUser, 201, res);
});

// ------------------------------------------------------------------------------------------------
//# vid(130. Logging in Users)
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //@ 1) Check if email and password exist
  if (!email || !password) {
    // ERROR if we not new [return]: Cannot set headers after they are sent to the client
    return next(new AppError('Please provide email and password!', 400));
  }

  //@ 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  // const correct = await user.correctPassword(password, user.password);
  //% if user not found then user.password will not found

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //@ 3) If everything ok, send token to clint
  // const token = signToken(user._id);

  // res.status(200).json({
  //   status: 'success',
  //   token
  // });
  //# vid(138. Updating the Current User: Password)
  createSendToken(user, 200, res);
});

//$ ------------------------------------------------------------------------------------------------
//# vid(192. Logging out Users)
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

// ------------------------------------------------------------------------------------------------
//# vid(131. Protecting Tour Routes - Part 1)
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // console.log('Token: ', token);
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// ------------------------------------------------------------------------------------------------
//# vid(190. Logging in Users with Our API - Part 2)
// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// ------------------------------------------------------------------------------------------------
//# vid(134. Authorization: User Roles and Permissions)
// used in tourRoutes in delete function
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array ['admin', 'lead-guide']. role='user' not have permision
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

// ------------------------------------------------------------------------------------------------
//# vid(135. Password Reset Functionality: Reset Token)
exports.forgetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Generate the random rest token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //@ 3) Send it to user's email
  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  // await sendEmail({
  //   email: user.email, // req.body.email
  //   subject: 'Your password reset token (valid for 10 min)',
  //   message
  // });
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending to email. Try again later!', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or expired.', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changePasswordAt property for the user

  // 4) Log the user in, send JWT
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token
  // });
  //# vid(138. Updating the Current User: Password)
  createSendToken(user, 200, res);
});

// ------------------------------------------------------------------------------------------------
//# vid(138. Updating the Current User: Password)
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) IF so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT word as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
