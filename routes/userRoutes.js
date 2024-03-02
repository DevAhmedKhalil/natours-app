const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

//# vid(126. Creating New User)
router.post('/signup', authController.signup);

//# vid(130. Logging in Users)
router.post('/login', authController.login);

//$ vid(192. Logging out Users)
router.get('/logout', authController.logout);

//# vid(135. Password Reset Functionality: Reset Token)
router.post('/forgotPassword', authController.forgetPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

//& PROTECT ALL ROUTES AFTER THIS MIDDLEWARE (Only Logged In Users)
router.use(authController.protect);

//# vid(138. Updating the Current User: Password)
router.patch(
  '/updateMyPassword',
  // authController.protect,
  authController.updatePassword
);

//# vid( 164. Adding a /me Endpointv )
router.get(
  '/me',
  // authController.protect,
  userController.getMe,
  userController.getUser
);

//# vid(139. Updating the Current User: Data)
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

//# vid(140. Deleting the Current User)
router.delete('/deleteMe', userController.deleteMe);

//& Admin Only Make After This Middleware
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
