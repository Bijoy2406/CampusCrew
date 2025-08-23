const express = require('express');
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const MongDB = require('./database')
const port = process.env.PORT || 8000
const frontend_url = process.env.frontend_url


const UserRouter = require('./Router/UserRoute')
const EventRouter = require('./Router/EventRoute')
const RegistrationRouter = require('./Router/RegistrationRoute')


app.use(express.json())
MongDB();
const allowedOrigins = [
    frontend_url,
    'https://talk-threads-seven.vercel.app'
];


app.use(cors({
    origin: function (origin, callback) {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ['Content-Type', 'Authorization', 'refreshtoken'],
}))
app.use(cookieParser())


app.get('/', (req, res) => {
    res.status(200).send(`Backend is running in port ${port}`)
})


app.listen(port, () => {
    console.log(`Backend is running on port ${port}`)
})


app.use('/api', UserRouter)
app.use('/api', EventRouter)
app.use('/api', RegistrationRouter)