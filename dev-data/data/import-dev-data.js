const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Tour = require('./../../models/tourModel');
const Review = require('./../../models/reviewModel');
const User = require('./../../models/userModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => {
    // console.log(con.connections);
    console.log('DataBase Connection Successuful...');
  });

//# vid( 150. Modelling Locations (Geospatial Data) )
//* READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

//* IMPORT DATA INTO BATABASE
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('DATA Successfully Loaded..');
  } catch (err) {
    console.log(err);
  }
};

//* DELETE ALL DATA FROM BATABASE
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('ALL DATA Successfully Deleted..');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

// $ node ./dev-data/data/import-dev-data.js --delete
// $ node ./dev-data/data/import-dev-data.js --import
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

// console.log(process.argv);
/*
console.log(process.argv);
=>-------TERMINAL-------
node .\dev-data\data\import-dev-data.js --import
=>--------OUTPUT--------
[
  'C:\\Program Files\\nodejs\\node.exe',
  'D:\\_Learning\\Jonas\\Node.js\\4-natours\\starter\\after-section-06\\dev-data\\data\\import-dev-data.js',
  '--import'
]
*/
