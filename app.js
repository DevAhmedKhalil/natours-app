const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

// ------------------------------------------------------------------------------------------------
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
//# vid( 155. Creating and Getting Reviews )
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

// ------------------------------------------------------------------------------------------------
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// ------------------------------------------------------------------------------------------------
//& 1) GLOBAL MIDDLEWARES

app.use(
  cors({
    origin: 'http://127.0.0.1:3000',
    credentials: true
  })
);

// Serving Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public/js')));

// -------------------------------------------
//@ Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// -------------------------------------------
//# vid(143. Implementing Rate Limiting)
//@ Limit request from same API
const limiter = rateLimit({
  // this allows 100 requests per 1 hour
  max: 10,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// -------------------------------------------
//@ Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// -------------------------------------------
//# vid(145. Data Sanitization)
//@ 1) Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

//@ 2) Data Sanitization against XSS attack
app.use(xss());

// -------------------------------------------
//# vid(146. Preventing Parameter Pollution)
//@ URL query string handling
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

app.use(compression());
// -------------------------------------------

//@ Testing middlewares
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// ------------------------------------------------------------------------------------------------
//& 3) ROUTES

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
//# vid( 155. Creating and Getting Reviews )
app.use('/api/v1/reviews', reviewRouter);
//# vid( 211. )
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server! `, 404));
});

//% Global Error Handling Middleware
app.use(globalErrorHandler);

//% Set Content Security Policy headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'data:', 'blob:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      scriptSrc: [
        "'self'",
        'https://*.cloudflare.com',
        'https://*.stripe.com',
        'http:',
        'https://*.mapbox.com',
        'data:'
      ],
      frameSrc: ["'self'", 'https://*.stripe.com'],
      objectSrc: ["'none'"],
      styleSrc: ["'self'", 'https:', 'unsafe-inline'],
      workerSrc: ["'self'", 'data:', 'blob:'],
      childSrc: ["'self'", 'blob:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: [
        "'self'",
        'blob:',
        'https://*.mapbox.com',
        'ws://*',
        'ws://127.0.0.1:50429/'
      ], // Add 'ws://' for WebSocket connections
      upgradeInsecureRequests: []
    }
  })
);

module.exports = app;
