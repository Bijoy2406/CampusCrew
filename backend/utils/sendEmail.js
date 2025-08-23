const nodemailer = require('nodemailer')
require('dotenv').config()
module.exports = async (email, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            service: "gmail",
            port: 587,
            secure: false,
            auth: {
                user: process.env.USER_MAIL,
                pass: process.env.PASSWORD,
            }
        })
        await transporter.sendMail({
            from: process.env.USER_MAIL,
            to: email,
            subject: subject,
            text: text

        })
    } catch (error) {
        console.log("Could not send Messege")
        console.log(error)

    }
}