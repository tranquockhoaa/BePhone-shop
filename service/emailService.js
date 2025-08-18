const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars").default || require("nodemailer-express-handlebars");
const path = require("path");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const handlebarOptions = {
  viewEngine: {
    extName: ".hbs",
    partialsDir: path.resolve(__dirname, "../views/emails"),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, "../views/emails"),
  extName: ".hbs",
};
transporter.use("compile", hbs(handlebarOptions));

async function sendVerificationEmail(to, code) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Mã xác nhận lấy lại mật khẩu",
    template: "verification",  
    context: {
      code,
    },
  };

  await transporter.sendMail(mailOptions);
}

async function sendPaymentSuccessEmail(to, orderDetails) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Xác nhận thanh toán thành công",
    template: "paymentSuccess",
    context: {
      title: orderDetails?.title || "Thanh Toán Thành Công",
      message: orderDetails?.message || "Cảm ơn bạn đã thanh toán! Giao dịch của bạn đã được xử lý thành công.",
      customerName: orderDetails.customerName,
      code: orderDetails.code,
      amount: orderDetails.amount,
      paymentDate: orderDetails.paymentDate,
    },
  };

  await transporter.sendMail(mailOptions);
}


module.exports = { sendVerificationEmail, sendPaymentSuccessEmail };
