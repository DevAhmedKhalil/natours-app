//# vid(136. Sending Emails with Nodemailer)

const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

//# vid(206. Building a Complex Email Handler)
// Example: new Email(user, url).sendWelcome();
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `jonas kk <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //! SendinBlue ***
      return nodemailer.createTransport({
        service: 'sendinblue',
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.SENDINBLUE_LOGIN,
          pass: process.env.SENDINBLUE_PASSWORD
        }
      });
    }
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject
    });

    // 2) Define the email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: html,
      text: htmlToText(html)
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};

// const sendEmail = async options => {
// // 1) Create a transporter
// const transporter = nodemailer.createTransport({
//   // service: 'Gmail',
//   host: process.env.EMAIL_HOST,
//   port: process.env.EMAIL_PORT,
//   auth: {
//     user: process.env.EMAIL_USERNAME,
//     pass: process.env.EMAIL_PASSWORD
//   }
//   // Activate in gmail "less secure app" option
// });

// 2) Define the email options
// const mailOptions = {
//   from: 'jonas kk <hello@jonas.io>',
//   to: options.email,
//   subject: options.subject,
//   text: options.message
// };

// 3) Actually send the email
// await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
