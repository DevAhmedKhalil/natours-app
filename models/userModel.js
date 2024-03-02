const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    //# vid(134. Authorization: User Roles and Permissions)
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    //^ vid(140. Deleting the Current User)
    type: Boolean,
    default: true,
    select: false
  }
});

// ------------------------------------------------------------------------------------------------
//# vid(127. Managing Passwords)
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  //@ (Hashing) Enqript the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

// ------------------------------------------------------------------------------------------------
//# vid(137. Password Reset Functionality: Setting New Password)
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// ------------------------------------------------------------------------------------------------
//^ vid(140. Deleting the Current User)
userSchema.pre(/^find/, function(next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// ------------------------------------------------------------------------------------------------
//# vid(130. Logging in Users)
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  //% return true if the userPassword[Hashed in DB] is the same of the candidate password[in login]
  return await bcrypt.compare(candidatePassword, userPassword);
};

// ------------------------------------------------------------------------------------------------
//# vid(132. Protecting Tour Routes - Part 2)
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // console.log(this.passwordChangedAt, JWTTimestamp); // 2019-04-05T00:00:00.000Z 1697097033
    // console.log(changedTimestamp, JWTTimestamp); //1554422400000 1697097033

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

// ------------------------------------------------------------------------------------------------
//# vid(135. Password Reset Functionality: Reset Token)
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// ------------------------------------------------------------------------------------------------
const User = mongoose.model('User', userSchema);

module.exports = User;
